import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Query, DocumentData } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, safeServerError } from "@/lib/http/apiHelpers";
import { parseTimeRange, cutoffIsoForRange } from "@/lib/analytics/timeRange";
import type { AnalyticsSummary } from "@/types/analytics";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  const rawRange = req.query.timeRange;
  const timeRange = parseTimeRange(Array.isArray(rawRange) ? rawRange[0] : rawRange ?? "30d");
  if (timeRange === null) {
    return res.status(400).json({ error: "invalid_time_range", message: 'timeRange must be one of "7d", "30d", "all".' });
  }

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const eventsRef = db.collection("workspaces").doc(workspaceId).collection("analyticsEvents");
    let query: Query<DocumentData> = eventsRef.where("isTest", "==", false);
    const cutoff = cutoffIsoForRange(timeRange);
    if (cutoff) query = query.where("occurredAt", ">=", cutoff);

    const snapshot = await query.get();

    let conversations = 0;
    let assistantResponses = 0;
    let assistantFailures = 0;
    let leads = 0;
    let handoffs = 0;

    snapshot.forEach((doc) => {
      const evt = doc.data();
      if (evt.eventName === "conversation_started") conversations++;
      if (evt.eventName === "assistant_response_generated") assistantResponses++;
      if (evt.eventName === "assistant_response_failed") assistantFailures++;
      if (evt.eventName === "lead_created") leads++;
      if (evt.eventName === "handoff_requested") handoffs++;
    });

    const summary: AnalyticsSummary = {
      workspaceId,
      timeRange,
      hasData: snapshot.size > 0,
      totalEvents: snapshot.size,
      metrics: { conversations, assistantResponses, assistantFailures, leads, handoffs },
      funnel: [
        { step: "1. Conversation Started", count: conversations },
        { step: "2. Assistant Responded", count: assistantResponses },
        { step: "3. Lead Captured", count: leads },
        { step: "4. Human Handoff Requested", count: handoffs },
      ],
    };

    return res.status(200).json(summary);
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/analytics/summary", error);
  }
}
