import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../../src/lib/firebase/admin.js";
import { requireFirebaseUser } from "../../../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../../src/lib/http/rateLimit.js";
import { recordAuditEvent } from "../../../../../src/lib/audit/log.js";
import type { WorkspaceInvite } from "../../../../../src/types/invite.js";
import { workspaceMemberDocId, type WorkspaceMember } from "../../../../../src/types/workspace.js";

/**
 * Accepting an invite is how a user BECOMES a workspace member, so this
 * intentionally does NOT use requireWorkspaceRole/requireWorkspaceMembership
 * (which would always reject them) — only that they're a real signed-in
 * Firebase user. The invite's own email match is the authorization check.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const inviteId = getPathParam(req, "inviteId");
  if (!workspaceId || !inviteId) return res.status(400).json({ error: "invalid_path" });

  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  // Defense-in-depth against brute-forcing invite IDs, scoped per user.
  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:invite-accept:${user.uid}`, 10);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const inviteRef = db.collection("workspaces").doc(workspaceId).collection("invites").doc(inviteId);
    const inviteDoc = await inviteRef.get();
    if (!inviteDoc.exists) return res.status(404).json({ error: "invite_not_found" });
    const invite = inviteDoc.data() as WorkspaceInvite;

    if (invite.status === "accepted") {
      // Already accepted -- most likely a duplicate click/retry. Idempotent
      // success rather than an error, as long as it was THIS user who
      // accepted it.
      if (invite.acceptedBy === user.uid) return res.status(200).json({ ok: true, workspaceId });
      return res.status(409).json({ error: "invite_already_accepted" });
    }
    if (invite.status !== "pending") return res.status(410).json({ error: "invite_not_available" });
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await inviteRef.update({ status: "expired" });
      return res.status(410).json({ error: "invite_expired" });
    }
    if (!user.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({
        error: "email_mismatch",
        message: "Sign in with the email address this invite was sent to.",
      });
    }

    const workspaceDoc = await db.collection("workspaces").doc(workspaceId).get();
    if (!workspaceDoc.exists) return res.status(404).json({ error: "workspace_not_found" });

    const now = new Date().toISOString();
    const memberRef = db.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceId, user.uid));
    const member: WorkspaceMember = {
      workspaceId,
      userId: user.uid,
      ...(user.email ? { email: user.email } : {}),
      role: invite.role,
      status: "active",
      createdAt: now,
    };

    const batch = db.batch();
    batch.set(memberRef, { ...member });
    batch.update(inviteRef, { status: "accepted", acceptedAt: now, acceptedBy: user.uid });
    await batch.commit();

    await recordAuditEvent({
      workspaceId,
      event: "member_invite_accepted",
      actorUid: user.uid,
      detail: { role: invite.role },
    });

    return res.status(200).json({ ok: true, workspaceId });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/invites/:inviteId/accept", error);
  }
}
