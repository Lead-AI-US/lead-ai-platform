import type { IsoTimestamp } from "./firestoreTimestamp.js";

export interface AutomationTrigger {
  type: "lead_created" | "human_handoff_requested" | "knowledge_missing" | "conversation_resolved";
}

export interface AutomationCondition {
  field: "intent" | "leadStatus" | "qualificationScore" | "channel";
  operator: "equals" | "not_equals" | "gte" | "lte";
  value: string | number | boolean;
}

export interface AutomationAction {
  type: "request_booking" | "schedule_followup" | "request_handoff" | "notify_team";
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
