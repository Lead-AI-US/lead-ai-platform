import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPathParam, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { requireWorkspaceMembership } from "../../../../src/lib/auth/serverAuth.js";
import { providerAdapters } from "../../../_lib/providerAdapters.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) {
    res.status(400).json({ error: "workspace_id_required" });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = await requireWorkspaceMembership(req, res, workspaceId);
  if (!auth) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:integrations-health:${auth.uid}`, 30);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  try {
    const providers = await Promise.all(
      Object.values(providerAdapters).map((adapter) => adapter.readAccount({ workspaceId: auth.workspaceId }))
    );
    res.status(200).json({ workspaceId: auth.workspaceId, providers });
  } catch (error) {
    safeServerError(res, "provider health", error);
  }
}
