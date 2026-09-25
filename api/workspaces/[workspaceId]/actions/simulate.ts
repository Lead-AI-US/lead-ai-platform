import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { simulateAction } from "../../../../src/server/actions/actionSimulation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:actions-simulate:${ctx.uid}`, 30);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  if (req.body?.workspaceId !== workspaceId) {
    return res.status(403).json({ error: { code: "WORKSPACE_FORBIDDEN", message: "Workspace access denied." } });
  }

  return res.status(200).json(simulateAction({ input: req.body, actorRole: ctx.role }));
}
