import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { UpdateLeadStatusSchema } from "@/lib/validation/lead";
import { recordAuditEvent } from "@/lib/audit/log";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const leadId = getPathParam(req, "leadId");
  if (!workspaceId || !leadId) return res.status(400).json({ error: "invalid_path" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "member");
  if (!ctx) return;

  const input = parseBody(req, res, UpdateLeadStatusSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("leads").doc(leadId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "lead_not_found" });

    await ref.update({ status: input.status, updatedAt: new Date().toISOString() });
    await recordAuditEvent({
      workspaceId,
      event: "lead_status_changed",
      actorUid: ctx.uid,
      detail: { leadId, status: input.status },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id/leads/:leadId", error);
  }
}
