import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { UpdateWorkspaceSettingsSchema } from "@/lib/validation/workspaceSettings";
import { recordAuditEvent } from "@/lib/audit/log";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  // Origin allowlist / status changes affect who can reach the widget - admin only.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const input = parseBody(req, res, UpdateWorkspaceSettingsSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "workspace_not_found" });

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.allowedOrigins !== undefined) patch.allowedOrigins = input.allowedOrigins;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.status !== undefined) patch.status = input.status;

    await ref.update(patch);
    await recordAuditEvent({
      workspaceId,
      event: "workspace_settings_changed",
      actorUid: ctx.uid,
      detail: { fields: Object.keys(patch).filter((k) => k !== "updatedAt").join(",") },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id", error);
  }
}
