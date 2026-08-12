import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type AgentActionType =
  | "create_lead"
  | "update_lead_stage"
  | "schedule_followup"
  | "request_handoff"
  | "add_customer_tag"
  | "create_internal_note"
  | "request_booking";

export type AgentActionStatus =
  | "proposed"
  | "validated"
  | "pending_approval"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type ActionRisk = "low" | "medium" | "high";
export type ActionProposedByType = "ai" | "user" | "system" | "automation";
export type ActionFailureCode =
  | "ACTION_NOT_SUPPORTED"
  | "ACTION_POLICY_DENIED"
  | "ACTION_APPROVAL_REQUIRED"
  | "ACTION_ALREADY_COMPLETED"
  | "ACTION_INVALID_STATE"
  | "ACTION_EXECUTION_FAILED";

/** Firestore path: workspaces/{workspaceId}/agentActions/{actionId} */
export interface AgentAction {
  id: string;
  workspaceId: string;
  type: AgentActionType;
  status: AgentActionStatus;
  risk: ActionRisk;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  sourceEventId?: string;
  automationRunId?: string;
  idempotencyKey: string;
  proposedBy: {
    type: ActionProposedByType;
    id?: string;
  };
  rationale?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
  failureCode?: ActionFailureCode;
  payload?: Record<string, string | number | boolean | null>;
}
