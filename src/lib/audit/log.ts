/** Audit logging — SERVER ONLY. Fail-safe: never blocks the action it records. */
import { getAdminDb } from "../firebase/admin.js";
import type { AuditEventName, AuditLogEntry } from "../../types/audit.js";

export async function recordAuditEvent(params: {
  workspaceId: string;
  event: AuditEventName;
  actorUid: string;
  detail?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  try {
    const id = crypto.randomUUID();
    const entry: AuditLogEntry = {
      id,
      workspaceId: params.workspaceId,
      event: params.event,
      actorUid: params.actorUid,
      // Firestore rejects `undefined` field values outright; most callers
      // (e.g. api/workspaces/index.ts's workspace_created event) don't pass
      // detail, so it must be omitted entirely rather than set to
      // undefined, or every such call silently fails in the catch below.
      ...(params.detail ? { detail: params.detail } : {}),
      createdAt: new Date().toISOString(),
    };
    await db
      .collection("workspaces")
      .doc(params.workspaceId)
      .collection("auditLogs")
      .doc(id)
      .set({ ...entry });
  } catch (error) {
    console.warn("[audit] failed to record event gracefully", error);
  }
}
