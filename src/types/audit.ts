import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type AuditEventName =
  | "workspace_created"
  | "knowledge_approved"
  | "knowledge_archived"
  | "lead_status_changed"
  | "handoff_requested"
  | "agent_action_proposed"
  | "agent_action_executed"
  | "agent_action_failed"
  | "automation_run_completed"
  | "automation_run_failed"
  | "automation_enabled"
  | "automation_disabled"
  | "agent_configuration_changed"
  | "integration_changed"
  | "workspace_settings_changed";

/** Firestore path: workspaces/{workspaceId}/auditLogs/{entryId} */
export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  event: AuditEventName;
  actorUid: string;
  /** Small, non-PII detail (e.g. { field: "allowedOrigins" }). */
  detail?: Record<string, string | number | boolean | null>;
  createdAt: IsoTimestamp;
}
