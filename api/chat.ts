import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { ChatMessageInputSchema } from "@/lib/validation/chat";
import { isOriginAllowed } from "@/lib/http/originPolicy";
import { checkRateLimit } from "@/lib/http/rateLimit";
import { orchestrateAssistantResponse } from "@/lib/ai/orchestrator";
import { trackEvent } from "@/lib/analytics/track";
import type { Workspace } from "@/types/workspace";
import type { KnowledgeSource } from "@/types/knowledge";
import type { Conversation, ConversationStatus, Message } from "@/types/conversation";
import type { Lead } from "@/types/lead";

/**
 * POST /api/chat — the public website-chat widget endpoint.
 *
 * Visitor -> widget -> publicWidgetKey -> workspace resolution -> origin
 * validation -> rate limit -> conversation persisted -> ONLY this
 * workspace's approved knowledge loaded -> AI orchestrator -> structured
 * decision -> server decides lead/handoff actions -> response to visitor.
 *
 * The model never writes to Firestore directly - everything below happens
 * after orchestrateAssistantResponse() returns a decision.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  // We need the workspace's allowedOrigins before we can decide the CORS
  // header, so preflight is answered generously (echoing Origin) and the
  // real decision is enforced on the POST itself, matching the widget's
  // actual security boundary (server auth of the widget key + origin).
  if (req.method === "OPTIONS") {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const input = parseBody(req, res, ChatMessageInputSchema);
  if (!input) return;

  try {
    const wsSnap = await db.collection("workspaces").where("publicWidgetKey", "==", input.widgetKey).limit(1).get();
    if (wsSnap.empty) {
      return res.status(404).json({ error: "widget_not_found" });
    }
    const workspace = wsSnap.docs[0].data() as Workspace;

    if (!isOriginAllowed(origin, workspace.allowedOrigins)) {
      return res.status(403).json({ error: "origin_not_allowed" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin as string);
    res.setHeader("Vary", "Origin");

    const rateLimit = await checkRateLimit(workspace.id, `${workspace.id}:${input.visitorSessionId}`);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: "rate_limited" });
    }

    const conversationsCol = db.collection("workspaces").doc(workspace.id).collection("conversations");
    let conversationId = input.conversationId;
    let isNewConversation = false;
    let conversationRef = conversationId ? conversationsCol.doc(conversationId) : conversationsCol.doc();

    if (conversationId) {
      const existing = await conversationRef.get();
      if (!existing.exists) {
        conversationRef = conversationsCol.doc();
        conversationId = conversationRef.id;
        isNewConversation = true;
      }
    } else {
      conversationId = conversationRef.id;
      isNewConversation = true;
    }

    const now = new Date().toISOString();
    const messagesRef = conversationRef.collection("messages");

    const visitorMsgRef = messagesRef.doc();
    const visitorMessage: Message = { id: visitorMsgRef.id, role: "visitor", content: input.message, createdAt: now };
    await visitorMsgRef.set({ ...visitorMessage });

    const knowledgeSnap = await db
      .collection("workspaces")
      .doc(workspace.id)
      .collection("knowledgeSources")
      .where("status", "==", "approved")
      .get();
    // Scoped to workspaces/{workspace.id}/knowledgeSources — structurally
    // cannot include another tenant's knowledge, not just filtered by field.
    const approvedKnowledge = knowledgeSnap.docs.map((d) => d.data() as KnowledgeSource);

    const start = Date.now();
    const result = await orchestrateAssistantResponse({
      businessName: workspace.name,
      approvedKnowledge,
      userMessage: input.message,
    });
    const durationMs = Date.now() - start;

    const assistantMsgRef = messagesRef.doc();
    const assistantMessage: Message = {
      id: assistantMsgRef.id,
      role: "assistant",
      content: result.decision.response,
      createdAt: new Date().toISOString(),
    };
    await assistantMsgRef.set({ ...assistantMessage });

    let leadId: string | undefined;
    if (result.decision.shouldCreateLead) {
      const leadRef = db.collection("workspaces").doc(workspace.id).collection("leads").doc();
      const lead: Lead = {
        id: leadRef.id,
        workspaceId: workspace.id,
        source: "website_chat",
        name: result.decision.collectedFields?.name,
        email: result.decision.collectedFields?.email,
        phone: result.decision.collectedFields?.phone,
        message: input.message,
        status: "new",
        conversationId,
        createdAt: now,
        updatedAt: now,
      };
      await leadRef.set({ ...lead });
      leadId = leadRef.id;
      await trackEvent({ workspaceId: workspace.id, eventName: "lead_created", actorType: "visitor" });
    }

    const conversationStatus: ConversationStatus = result.decision.shouldRequestHandoff ? "needs_human" : "active";

    if (isNewConversation) {
      const conversation: Conversation = {
        id: conversationId,
        workspaceId: workspace.id,
        channel: "website",
        status: conversationStatus,
        visitorSessionId: input.visitorSessionId,
        leadId,
        createdAt: now,
        updatedAt: now,
      };
      await conversationRef.set({ ...conversation });
      await trackEvent({ workspaceId: workspace.id, eventName: "conversation_started", actorType: "visitor" });
    } else {
      await conversationRef.update({
        status: conversationStatus,
        updatedAt: new Date().toISOString(),
        ...(leadId ? { leadId } : {}),
      });
    }

    await trackEvent({
      workspaceId: workspace.id,
      eventName: result.usedFallback ? "assistant_response_failed" : "assistant_response_generated",
      actorType: "system",
      properties: { durationMs, reason: result.fallbackReason ?? null },
    });

    if (result.decision.shouldRequestHandoff) {
      // Persisted above via conversationStatus="needs_human" BEFORE this
      // event and BEFORE the response is returned to the visitor - the
      // dashboard can already see it by the time the widget renders a reply.
      await trackEvent({ workspaceId: workspace.id, eventName: "handoff_requested", actorType: "visitor" });
    }

    return res.status(200).json({
      conversationId,
      reply: result.decision.response,
      intent: result.decision.intent,
      shouldRequestHandoff: result.decision.shouldRequestHandoff,
    });
  } catch (error) {
    return safeServerError(res, "POST /api/chat", error);
  }
}
