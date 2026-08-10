import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { CreateLeadSchema } from "@/lib/validation/lead";
import type { Lead } from "@/types/lead";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  if (req.method === "GET") return handleList(req, res, workspaceId);
  if (req.method === "POST") return handleCreate(req, res, workspaceId);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method_not_allowed" });
}

async function handleList(req: VercelRequest, res: VercelResponse, workspaceId: string) {
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const snapshot = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("leads")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const leads = snapshot.docs.map((doc) => doc.data() as Lead);
    return res.status(200).json({ leads });
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/leads", error);
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse, workspaceId: string) {
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "member");
  if (!ctx) return;

  const input = parseBody(req, res, CreateLeadSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("leads").doc();
    const now = new Date().toISOString();
    const lead: Lead = {
      id: ref.id,
      workspaceId,
      source: input.source,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      conversationId: input.conversationId,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set({ ...lead });
    return res.status(201).json({ lead });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/leads", error);
  }
}
