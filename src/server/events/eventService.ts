import type { DocumentData, Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin.js";
import type { BusinessEvent, BusinessEventActorType, BusinessEventType, TimelineItem } from "@/types/event.js";

const SAFE_METADATA_KEYS = new Set([
  "channel",
  "confidence",
  "durationMs",
  "intent",
  "knowledgeCount",
  "leadStatus",
  "reason",
  "source",
  "status",
]);

const SECRET_KEY_PATTERN = /(authorization|bearer|cookie|firebase|idtoken|openai|password|private|secret|token|key)/i;

export function sanitizeEventMetadata(input?: Record<string, unknown>): Record<string, string | number | boolean | null> {
  if (!input) return {};
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!SAFE_METADATA_KEYS.has(key) || SECRET_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

export async function recordEvent(params: {
  workspaceId: string;
  type: BusinessEventType;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  agentActionId?: string;
  sourceEventId?: string;
  automationRunId?: string;
  actor: { type: BusinessEventActorType; id?: string };
  source?: { channel?: string; integration?: string };
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<BusinessEvent | null> {
  if (!params.workspaceId.trim()) return null;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const ref = db.collection("workspaces").doc(params.workspaceId).collection("events").doc();
    const event: BusinessEvent = {
      id: ref.id,
      workspaceId: params.workspaceId,
      type: params.type,
      customerId: params.customerId,
      leadId: params.leadId,
      conversationId: params.conversationId,
      agentActionId: params.agentActionId,
      sourceEventId: params.sourceEventId,
      automationRunId: params.automationRunId,
      actor: params.actor,
      source: params.source ?? {},
      metadata: sanitizeEventMetadata(params.metadata),
      occurredAt: params.occurredAt ?? new Date().toISOString(),
    };
    await ref.set({ ...event });
    return event;
  } catch (error) {
    console.warn("[events] failed to record event gracefully", error);
    return null;
  }
}

export async function listEvents(params: {
  workspaceId: string;
  limit?: number;
  customerId?: string;
  conversationId?: string;
}): Promise<BusinessEvent[]> {
  const db = getAdminDb();
  if (!db) return [];

  let q: Query<DocumentData> = db.collection("workspaces").doc(params.workspaceId).collection("events");
  if (params.customerId) q = q.where("customerId", "==", params.customerId);
  if (params.conversationId) q = q.where("conversationId", "==", params.conversationId);

  const snap = await q.orderBy("occurredAt", "desc").limit(params.limit ?? 100).get();
  return snap.docs.map((doc) => doc.data() as BusinessEvent);
}

export function toTimelineItems(events: BusinessEvent[]): TimelineItem[] {
  return [...events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      type: event.type,
      title: titleForEvent(event),
      description: descriptionForEvent(event),
      customerId: event.customerId,
      leadId: event.leadId,
      conversationId: event.conversationId,
      agentActionId: event.agentActionId,
      automationRunId: event.automationRunId,
      actorType: event.actor.type,
      occurredAt: event.occurredAt,
    }));
}

export async function listCustomerTimeline(workspaceId: string, customerId: string): Promise<TimelineItem[]> {
  return toTimelineItems(await listEvents({ workspaceId, customerId }));
}

export async function listConversationTimeline(workspaceId: string, conversationId: string): Promise<TimelineItem[]> {
  return toTimelineItems(await listEvents({ workspaceId, conversationId }));
}

function titleForEvent(event: BusinessEvent): string {
  const intent = typeof event.metadata.intent === "string" ? event.metadata.intent : undefined;
  const titles: Record<BusinessEventType, string> = {
    visitor_started: "Visitor identified",
    conversation_started: "Conversation started",
    message_received: "Customer message received",
    message_sent: "AI message sent",
    knowledge_matched: "Knowledge matched",
    knowledge_missing: "Knowledge gap detected",
    intent_detected: intent ? `Intent detected: ${intent}` : "Intent detected",
    lead_created: "Lead created",
    lead_qualified: "Lead qualified",
    lead_stage_changed: "Lead stage changed",
    booking_requested: "Booking requested",
    booking_created: "Booking created",
    human_handoff_requested: "Human handoff requested",
    human_handoff_completed: "Human handoff completed",
    followup_scheduled: "Follow-up scheduled",
    followup_sent: "Follow-up sent",
    conversation_resolved: "Conversation resolved",
    customer_returned: "Customer returned",
    automation_started: "Automation started",
    automation_completed: "Automation completed",
    automation_failed: "Automation failed",
    agent_action_proposed: "Agent action proposed",
    agent_action_validated: "Agent action validated",
    agent_action_approval_required: "Agent action approval required",
    agent_action_started: "Agent action started",
    agent_action_completed: "Agent action completed",
    agent_action_failed: "Agent action failed",
    agent_action_cancelled: "Agent action cancelled",
  };
  return titles[event.type];
}

function descriptionForEvent(event: BusinessEvent): string | undefined {
  const parts = [
    typeof event.metadata.reason === "string" ? event.metadata.reason : undefined,
    typeof event.metadata.status === "string" ? `Status: ${event.metadata.status}` : undefined,
    typeof event.metadata.confidence === "number" ? `Confidence: ${Math.round(event.metadata.confidence * 100)}%` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}
