import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type AgentActionType =
  | "answer_customer"
  | "create_lead"
  | "update_lead"
  | "request_booking"
  | "schedule_followup"
  | "request_handoff"
  | "notify_team";

export type AgentActionStatus = "proposed" | "approved" | "executing" | "completed" | "failed" | "cancelled";

/** Firestore path: workspaces/{workspaceId}/agentActions/{actionId} */
export interface AgentAction {
  id: string;
  workspaceId: string;
  type: AgentActionType;
  status: AgentActionStatus;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  rationale?: string;
  createdAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
}
