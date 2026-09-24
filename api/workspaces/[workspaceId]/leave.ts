import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../src/lib/http/rateLimit.js";
import { recordAuditEvent } from "../../../src/lib/audit/log.js";
import { applyMemberUpdate } from "../../../src/server/members/memberService.js";

/**
 * Self-service "leave workspace" — any active member may call this on
 * themselves; no admin role required. The last active owner is blocked
 * (must transfer ownership to another member first, via
 * PATCH /members/:userId, before they can leave) — enforced by the same
 * applyMemberUpdate() transaction the admin route uses, so the safety
 * property is identical either way.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:leave:${ctx.uid}`, 10);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const result = await applyMemberUpdate({
      db,
      workspaceId,
      targetUserId: ctx.uid,
      patch: { status: "disabled" },
      authorize: (target) => target.status === "active",
    });

    if (result.code === "member_not_found") return res.status(404).json({ error: "member_not_found" });
    if (result.code === "forbidden") return res.status(409).json({ error: "already_left" });
    if (result.code === "last_owner") {
      return res.status(409).json({
        error: "last_owner",
        message: "Transfer ownership to another member before leaving — a workspace must keep at least one active owner.",
      });
    }

    await recordAuditEvent({ workspaceId, event: "member_left", actorUid: ctx.uid, detail: { targetUid: ctx.uid } });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/leave", error);
  }
}
