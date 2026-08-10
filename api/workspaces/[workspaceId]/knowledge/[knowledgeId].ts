import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { UpdateKnowledgeStatusSchema } from "@/lib/validation/knowledge";
import { recordAuditEvent } from "@/lib/audit/log";
import { trackEvent } from "@/lib/analytics/track";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const knowledgeId = getPathParam(req, "knowledgeId");
  if (!workspaceId || !knowledgeId) return res.status(400).json({ error: "invalid_path" });

  // Approving knowledge governs what the AI is allowed to say - admin only.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const input = parseBody(req, res, UpdateKnowledgeStatusSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("knowledgeSources").doc(knowledgeId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "knowledge_not_found" });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: input.status, updatedAt: now };
    if (input.status === "approved") {
      patch.approvedBy = ctx.uid;
      patch.approvedAt = now;
    }
    await ref.update(patch);

    await recordAuditEvent({
      workspaceId,
      event: "knowledge_approved",
      actorUid: ctx.uid,
      detail: { knowledgeId, status: input.status },
    });
    if (input.status === "approved") {
      await trackEvent({ workspaceId, eventName: "knowledge_approved", actorType: "workspace_user", actorId: ctx.uid });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id/knowledge/:knowledgeId", error);
  }
}
