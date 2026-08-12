import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, parseBody, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { UpdateLeadStatusSchema } from "../../../../src/lib/validation/lead.js";
import { recordAuditEvent } from "../../../../src/lib/audit/log.js";
import { recordEvent } from "../../../../src/server/events/eventService.js";
import type { Lead } from "../../../../src/types/lead.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  const leadId = getPathParam(req, "leadId");
  if (!workspaceId || !leadId) return res.status(400).json({ error: "invalid_path" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "member");
  if (!ctx) return;

  const input = parseBody(req, res, UpdateLeadStatusSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("leads").doc(leadId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "lead_not_found" });
    const lead = doc.data() as Lead;

    await ref.update({ status: input.status, updatedAt: new Date().toISOString() });
    await recordAuditEvent({
      workspaceId,
      event: "lead_status_changed",
      actorUid: ctx.uid,
      detail: { leadId, status: input.status },
    });
    await recordEvent({
      workspaceId,
      type: input.status === "qualified" ? "lead_qualified" : "lead_stage_changed",
      customerId: lead.customerId,
      leadId,
      conversationId: lead.conversationId,
      actor: { type: "user", id: ctx.uid },
      source: { channel: lead.source },
      metadata: { status: input.status, leadStatus: input.status },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return safeServerError(res, "PATCH /api/workspaces/:id/leads/:leadId", error);
  }
}
