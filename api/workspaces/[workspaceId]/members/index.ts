import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import type { WorkspaceMember } from "../../../../src/types/workspace.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:members-list:${ctx.uid}`, 60);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const snapshot = await db.collection("workspaceMembers").where("workspaceId", "==", workspaceId).get();
    const members = snapshot.docs.map((doc) => doc.data() as WorkspaceMember);
    return res.status(200).json({ members });
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/members", error);
  }
}
