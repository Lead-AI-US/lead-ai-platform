import type { IsoTimestamp } from "./firestoreTimestamp";

export type AnalyticsEventName =
  | "conversation_started"
  | "assistant_response_generated"
  | "assistant_response_failed"
  | "lead_created"
  | "handoff_requested"
  | "workspace_created"
  | "knowledge_approved";

export type ActorType = "visitor" | "workspace_user" | "system";

/** Firestore path: workspaces/{workspaceId}/analyticsEvents/{eventId} */
export interface AnalyticsEvent {
  id: string;
  workspaceId: string;
  eventName: AnalyticsEventName;
  actorType: ActorType;
  actorId?: string;
  /** Allow-listed metadata only — see src/lib/analytics/track.ts. Never raw PII. */
  properties: Record<string, string | number | boolean | null>;
  isTest: boolean;
  occurredAt: IsoTimestamp;
  schemaVersion: 1;
}

export interface AnalyticsSummary {
  workspaceId: string;
  timeRange: "7d" | "30d" | "all";
  hasData: boolean;
  totalEvents: number;
  metrics: {
    conversations: number;
    assistantResponses: number;
    assistantFailures: number;
    leads: number;
    handoffs: number;
  };
  funnel: { step: string; count: number }[];
}
