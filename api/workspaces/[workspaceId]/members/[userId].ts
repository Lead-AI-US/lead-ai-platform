import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, parseBody, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { UpdateMemberSchema } from "../../../../src/lib/validation/member.js";
import { recordAuditEvent } from "../../../../src/lib/audit/log.js";
import { canManageMemberRole, wouldRemoveLastOwner } from "../../../../src/server/members/memberPolicy.js";
import { workspaceMemberDocId, type WorkspaceMember } from "../../../../src/types/workspace.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const userId = getPathParam(req, "userId");
  if (!workspaceId || !userId) return res.status(400).json({ error: "invalid_path" });

  // Only an admin+ may change a role or disable a membership at all; the
  // finer-grained "admin can't touch another admin/owner" check happens
  // below, against the target's actual current role.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:member-update:${ctx.uid}`, 30);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const input = parseBody(req, res, UpdateMemberSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceId, userId));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "member_not_found" });
    const target = doc.data() as WorkspaceMember;

    if (!canManageMemberRole(ctx.role, target.role, input.role)) {
      return res.status(403).json({ error: "insufficient_role", message: "Only an owner can manage admin or owner memberships." });
    }

    const wasActiveOwner = target.role === "owner" && target.status === "active";
    if (wasActiveOwner) {
      const ownersSnapshot = await db
        .collection("workspaceMembers")
        .where("workspaceId", "==", workspaceId)
        .where("role", "==", "owner")
        .where("status", "==", "active")
        .get();
      const remainingActiveOwners = ownersSnapshot.docs.filter((d) => d.id !== ref.id).length;
      if (wouldRemoveLastOwner({ targetWasActiveOwner: true, remainingActiveOwners, nextRole: input.role, nextStatus: input.status })) {
        return res.status(409).json({ error: "last_owner", message: "A workspace must keep at least one active owner." });
      }
    }

    const patch: Record<string, unknown> = {};
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    await ref.update(patch);

    await recordAuditEvent({
      workspaceId,
      event: input.role !== undefined ? "member_role_changed" : "member_status_changed",
      actorUid: ctx.uid,
      detail: {
        targetUid: userId,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return res.status(200).json({ member: { ...target, ...patch } });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id/members/:userId", error);
  }
}
