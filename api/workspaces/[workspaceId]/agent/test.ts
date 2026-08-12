import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, parseBody, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { orchestrateAssistantResponse } from "../../../../src/lib/ai/orchestrator.js";
import { simulateAction } from "../../../../src/server/actions/actionSimulation.js";
import type { Workspace } from "../../../../src/types/workspace.js";
import type { KnowledgeSource } from "../../../../src/types/knowledge.js";
import type { AssistantDecision } from "../../../../src/types/ai.js";

const TestAgentInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  customerId: z.string().trim().max(200).optional(),
  conversationId: z.string().trim().max(200).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const input = parseBody(req, res, TestAgentInputSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:agent-test:${ctx.uid}`, 20);
    if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

    const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get();
    if (!workspaceSnap.exists) return res.status(404).json({ error: "workspace_not_found" });
    const workspace = workspaceSnap.data() as Workspace;

    const knowledgeSnap = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("knowledgeSources")
      .where("status", "==", "approved")
      .limit(50)
      .get();
    const approvedKnowledge = knowledgeSnap.docs.map((doc) => doc.data() as KnowledgeSource);

    const startedAt = Date.now();
    const result = await orchestrateAssistantResponse({
      businessName: workspace.name,
      approvedKnowledge,
      userMessage: input.message,
    });

    return res.status(200).json({
      mode: "test",
      persisted: false,
      workspaceId,
      decision: result.decision,
      usedFallback: result.usedFallback,
      fallbackReason: result.fallbackReason,
      providerRequestId: result.providerRequestId,
      durationMs: Date.now() - startedAt,
      approvedKnowledgeCount: approvedKnowledge.length,
      actionSimulations: buildActionSimulations({
        decision: result.decision,
        workspaceId,
        userId: ctx.uid,
        actorRole: ctx.role,
        customerId: input.customerId,
        conversationId: input.conversationId,
      }),
    });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/agent/test", error);
  }
}

function buildActionSimulations(params: {
  decision: AssistantDecision;
  workspaceId: string;
  userId: string;
  actorRole: "owner" | "admin" | "member" | "viewer";
  customerId?: string;
  conversationId?: string;
}) {
  const id = crypto.randomUUID();
  const simulations = [];

  if (params.decision.shouldCreateLead) {
    simulations.push(
      simulateAction({
        actorRole: params.actorRole,
        input: {
          type: "create_lead",
          workspaceId: params.workspaceId,
          customerId: params.customerId,
          conversationId: params.conversationId,
          idempotencyKey: `agent-test:${params.userId}:${id}:create-lead`,
          proposedBy: { type: "ai", id: "agent-test" },
          rationale: params.decision.reason ?? "AI test lead proposal",
          payload: {
            source: "website_chat",
            name: params.decision.collectedFields?.name ?? undefined,
            email: params.decision.collectedFields?.email ?? undefined,
            phone: params.decision.collectedFields?.phone ?? undefined,
            message: params.decision.response,
            intent: params.decision.intent,
          },
        },
      })
    );
  }

  if (params.decision.shouldRequestHandoff && params.conversationId) {
    simulations.push(
      simulateAction({
        actorRole: params.actorRole,
        input: {
          type: "request_handoff",
          workspaceId: params.workspaceId,
          customerId: params.customerId,
          conversationId: params.conversationId,
          idempotencyKey: `agent-test:${params.userId}:${id}:handoff`,
          proposedBy: { type: "ai", id: "agent-test" },
          rationale: params.decision.reason ?? "AI test handoff proposal",
          payload: { reason: params.decision.reason ?? "AI requested human review" },
        },
      })
    );
  }

  return simulations;
}
