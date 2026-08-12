import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Query, DocumentData } from "firebase-admin/firestore";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { parseTimeRange, cutoffIsoForRange } from "../../../../src/lib/analytics/timeRange.js";
import type { BusinessEvent, BusinessEventType } from "../../../../src/types/event.js";

export interface JourneyAnalytics {
  workspaceId: string;
  eventCounts: Partial<Record<BusinessEventType, number>>;
  transitions: { from: BusinessEventType; to: BusinessEventType; count: number }[];
  totalEvents: number;
  privacy: "aggregated";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  const rawRange = req.query.timeRange;
  const timeRange = parseTimeRange(Array.isArray(rawRange) ? rawRange[0] : rawRange ?? "30d");
  if (timeRange === null) return res.status(400).json({ error: "invalid_time_range" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const eventsRef = db.collection("workspaces").doc(workspaceId).collection("events");
    let query: Query<DocumentData> = eventsRef.orderBy("occurredAt", "desc").limit(500);
    const cutoff = cutoffIsoForRange(timeRange);
    if (cutoff) query = eventsRef.where("occurredAt", ">=", cutoff).orderBy("occurredAt", "desc").limit(500);

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => doc.data() as BusinessEvent).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const eventCounts: JourneyAnalytics["eventCounts"] = {};
    const transitions = new Map<string, { from: BusinessEventType; to: BusinessEventType; count: number }>();
    const byConversation = new Map<string, BusinessEvent[]>();

    for (const event of events) {
      eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
      if (!event.conversationId) continue;
      const current = byConversation.get(event.conversationId) ?? [];
      current.push(event);
      byConversation.set(event.conversationId, current);
    }

    byConversation.forEach((conversationEvents) => {
      for (let index = 1; index < conversationEvents.length; index++) {
        const from = conversationEvents[index - 1].type;
        const to = conversationEvents[index].type;
        const key = `${from}->${to}`;
        const existing = transitions.get(key) ?? { from, to, count: 0 };
        existing.count++;
        transitions.set(key, existing);
      }
    });

    const response: JourneyAnalytics = {
      workspaceId,
      eventCounts,
      transitions: [...transitions.values()].sort((a, b) => b.count - a.count).slice(0, 10),
      totalEvents: events.length,
      privacy: "aggregated",
    };

    return res.status(200).json(response);
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/analytics/journey", error);
  }
}
