import type { IsoTimestamp } from "./firestoreTimestamp.js";

export const BUSINESS_EVENT_TYPES = [
  "visitor_started",
  "conversation_started",
  "message_received",
  "message_sent",
  "knowledge_matched",
  "knowledge_missing",
  "intent_detected",
  "lead_created",
  "lead_qualified",
  "lead_stage_changed",
  "booking_requested",
  "booking_created",
  "human_handoff_requested",
  "human_handoff_completed",
  "followup_scheduled",
  "followup_sent",
  "conversation_resolved",
  "customer_returned",
  "automation_started",
  "automation_completed",
  "automation_failed",
] as const;

export type BusinessEventType = (typeof BUSINESS_EVENT_TYPES)[number];
export type BusinessEventActorType = "customer" | "ai" | "user" | "system";

/** Firestore path: workspaces/{workspaceId}/events/{eventId} */
export interface BusinessEvent {
  id: string;
  workspaceId: string;
  type: BusinessEventType;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  actor: {
    type: BusinessEventActorType;
    id?: string;
  };
  source: {
    channel?: string;
    integration?: string;
  };
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: IsoTimestamp;
}

export interface TimelineItem {
  id: string;
  workspaceId: string;
  type: BusinessEventType;
  title: string;
  description?: string;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  actorType: BusinessEventActorType;
  occurredAt: IsoTimestamp;
}
