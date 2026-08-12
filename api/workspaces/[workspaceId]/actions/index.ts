import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { proposeAction } from "../../../../src/server/actions/actionService.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "member");
  if (!ctx) return;

  try {
    const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:actions:${ctx.uid}`, 30);
    if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

    const result = await proposeAction({ input: req.body, auth: ctx, dryRun: false });
    if (!result.policy.allowed) {
      const status = result.policy.code === "ACTION_APPROVAL_REQUIRED" ? 409 : 403;
      return res.status(status).json({ action: result.action, policy: result.policy });
    }
    return res.status(201).json(result);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "ACTION_EXECUTION_FAILED";
    if (code === "WORKSPACE_FORBIDDEN") return res.status(403).json({ error: { code, message: "Workspace access denied." } });
    if (code === "ACTION_NOT_SUPPORTED") return res.status(400).json({ error: { code, message: "Action type is not supported." } });
    if (code === "ACTION_INVALID_STATE") return res.status(400).json({ error: { code, message: "Invalid action request." } });
    return safeServerError(res, "POST /api/workspaces/:id/actions", error);
  }
}
