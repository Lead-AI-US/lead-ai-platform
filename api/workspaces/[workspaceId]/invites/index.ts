import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../../src/lib/auth/serverAuth.js";
import { getPathParam, parseBody, safeServerError } from "../../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../../src/lib/http/rateLimit.js";
import { CreateInviteSchema } from "../../../../src/lib/validation/invite.js";
import { recordAuditEvent } from "../../../../src/lib/audit/log.js";
import type { WorkspaceInvite } from "../../../../src/types/invite.js";
import type { WorkspaceMember } from "../../../../src/types/workspace.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  if (req.method === "GET") return handleList(req, res, workspaceId);
  if (req.method === "POST") return handleCreate(req, res, workspaceId);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method_not_allowed" });
}

async function handleList(req: VercelRequest, res: VercelResponse, workspaceId: string) {
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:invites-list:${ctx.uid}`, 60);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const snapshot = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("invites")
      .where("status", "==", "pending")
      .get();
    const invites = snapshot.docs.map((doc) => doc.data() as WorkspaceInvite);
    return res.status(200).json({ invites });
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/invites", error);
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse, workspaceId: string) {
  // Inviting is an admin action; requesting an "owner" role is checked
  // separately below since even an admin may not grant ownership.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:invites-create:${ctx.uid}`, 20);
  if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

  const input = parseBody(req, res, CreateInviteSchema);
  if (!input) return;

  if (input.role === "owner" && ctx.role !== "owner") {
    return res.status(403).json({ error: "insufficient_role", message: "Only an owner can invite another owner." });
  }

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const membersRef = db.collection("workspaceMembers");
    const existingMember = await membersRef
      .where("workspaceId", "==", workspaceId)
      .where("email", "==", input.email)
      .limit(1)
      .get();
    if (!existingMember.empty && (existingMember.docs[0].data() as WorkspaceMember).status === "active") {
      return res.status(409).json({ error: "already_a_member" });
    }

    const invitesRef = db.collection("workspaces").doc(workspaceId).collection("invites");
    const existingInvite = await invitesRef
      .where("email", "==", input.email)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!existingInvite.empty) {
      return res.status(409).json({ error: "invite_already_pending" });
    }

    const ref = invitesRef.doc();
    const now = new Date();
    const invite: WorkspaceInvite = {
      id: ref.id,
      workspaceId,
      email: input.email,
      role: input.role,
      status: "pending",
      invitedBy: ctx.uid,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
    };
    await ref.set({ ...invite });

    await recordAuditEvent({
      workspaceId,
      event: "member_invited",
      actorUid: ctx.uid,
      detail: { role: input.role },
    });

    return res.status(201).json({ invite });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/invites", error);
  }
}
