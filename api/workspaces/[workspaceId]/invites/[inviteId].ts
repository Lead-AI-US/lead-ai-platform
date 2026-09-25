import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { recordAuditEvent } from "../../../../src/lib/audit/log.js";
import type { WorkspaceInvite } from "../../../../src/types/invite.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const inviteId = getPathParam(req, "inviteId");
  if (!workspaceId || !inviteId) return res.status(400).json({ error: "invalid_path" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:invites-revoke:${ctx.uid}`, 30);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("invites").doc(inviteId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "invite_not_found" });

    const invite = doc.data() as WorkspaceInvite;
    if (invite.role === "owner" && ctx.role !== "owner") {
      return res.status(403).json({ error: "insufficient_role", message: "Only an owner can revoke an owner invite." });
    }
    if (invite.status !== "pending") return res.status(409).json({ error: "invite_not_pending" });

    await ref.update({ status: "revoked" });
    await recordAuditEvent({ workspaceId, event: "member_invite_revoked", actorUid: ctx.uid, detail: { inviteId } });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "DELETE /api/workspaces/:id/invites/:inviteId", error);
  }
}
