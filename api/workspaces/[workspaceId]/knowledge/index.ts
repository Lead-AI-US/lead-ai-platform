import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireWorkspaceRole } from "@/lib/auth/serverAuth";
import { getPathParam, parseBody, safeServerError } from "@/lib/http/apiHelpers";
import { CreateKnowledgeSchema } from "@/lib/validation/knowledge";
import type { KnowledgeSource } from "@/types/knowledge";

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
      .collection("knowledgeSources")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    return res.status(200).json({ knowledge: snapshot.docs.map((d) => d.data() as KnowledgeSource) });
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/knowledge", error);
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse, workspaceId: string) {
  // Adding knowledge is an admin action - it becomes what the AI says on behalf of the business.
  const ctx = await requireWorkspaceRole(req, res, workspaceId, "admin");
  if (!ctx) return;

  const input = parseBody(req, res, CreateKnowledgeSchema);
  if (!input) return;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const ref = db.collection("workspaces").doc(workspaceId).collection("knowledgeSources").doc();
    const now = new Date().toISOString();
    const source: KnowledgeSource = {
      id: ref.id,
      workspaceId,
      title: input.title,
      content: input.content,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
    };
    await ref.set({ ...source });
    return res.status(201).json({ knowledge: source });
  } catch (error) {
    return safeServerError(res, "POST /api/workspaces/:id/knowledge", error);
  }
}
