import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, parseBody, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { UpdateMemberSchema } from "../../../../src/lib/validation/member.js";
import { recordAuditEvent } from "../../../../src/lib/audit/log.js";
import { canManageMemberRole } from "../../../../src/server/members/memberPolicy.js";
import { applyMemberUpdate } from "../../../../src/server/members/memberService.js";

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
  // in applyMemberUpdate's `authorize`, against the target's actual
  // current role.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:member-update:${ctx.uid}`, 30);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const input = parseBody(req, res, UpdateMemberSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const result = await applyMemberUpdate({
      db,
      workspaceId,
      targetUserId: userId,
      patch: input,
      authorize: (target) => canManageMemberRole(ctx.role, target.role, input.role),
    });

    if (result.code === "member_not_found") return res.status(404).json({ error: "member_not_found" });
    if (result.code === "forbidden") {
      return res.status(403).json({ error: "insufficient_role", message: "Only an owner can manage admin or owner memberships." });
    }
    if (result.code === "last_owner") {
      return res.status(409).json({ error: "last_owner", message: "A workspace must keep at least one active owner." });
    }

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

    return res.status(200).json({ member: { ...result.target, ...result.patch } });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id/members/:userId", error);
  }
}
