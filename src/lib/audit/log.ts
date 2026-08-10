/** Audit logging — SERVER ONLY. Fail-safe: never blocks the action it records. */
import { getAdminDb } from "@/lib/firebase/admin";
import type { AuditEventName, AuditLogEntry } from "@/types/audit";

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
      detail: params.detail,
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
