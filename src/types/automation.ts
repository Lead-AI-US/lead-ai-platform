import type { IsoTimestamp } from "./firestoreTimestamp.js";

export interface AutomationTrigger {
  type:
    | "lead_created"
    | "lead_qualified"
    | "human_handoff_requested"
    | "knowledge_missing"
    | "conversation_started"
    | "conversation_resolved";
}

export interface AutomationCondition {
  field: "intent" | "leadStatus" | "qualificationScore" | "channel" | "status";
  operator: "equals" | "not_equals" | "contains" | "in" | "greater_than" | "less_than" | "exists";
  value?: string | number | boolean | Array<string | number | boolean>;
}

export interface AutomationAction {
  type: "create_lead" | "update_lead_stage" | "schedule_followup" | "request_handoff" | "add_customer_tag" | "create_internal_note";
  config: Record<string, string | number | boolean | null>;
}

/** Firestore path: workspaces/{workspaceId}/automations/{automationId} */
export interface Automation {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type AutomationRunStatus = "queued" | "running" | "completed" | "partial" | "failed" | "skipped";

/** Firestore path: workspaces/{workspaceId}/automationRuns/{runId} */
export interface AutomationRun {
  id: string;
  workspaceId: string;
  automationId: string;
  sourceEventId: string;
  status: AutomationRunStatus;
  actionsAttempted: number;
  actionsCompleted: number;
  failureCode?: "AUTOMATION_CONDITION_FAILED" | "AUTOMATION_EXECUTION_FAILED" | "AUTOMATION_ALREADY_PROCESSED";
  retryCount: number;
  startedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
}
