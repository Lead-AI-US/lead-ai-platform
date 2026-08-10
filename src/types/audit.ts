import type { IsoTimestamp } from "./firestoreTimestamp";

export type AuditEventName =
  | "workspace_created"
  | "knowledge_approved"
  | "lead_status_changed"
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
