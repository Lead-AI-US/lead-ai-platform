import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminDb } from "../../../src/lib/firebase/admin.js";
import { requireWorkspaceRole } from "../../../src/lib/auth/serverAuth.js";
import { getPathParam, safeServerError } from "../../../src/lib/http/apiHelpers.js";
import { checkRateLimit } from "../../../src/lib/http/rateLimit.js";

interface SearchResult {
  id: string;
  type: "lead" | "customer" | "conversation" | "knowledge" | "ai_asset" | "integration";
  title: string;
  subtitle: string;
  href: string;
}

const COLLECTIONS = [
  { name: "leads", type: "lead", href: "/app/leads", fields: ["name", "email", "phone", "message", "status", "intent"] },
  { name: "customers", type: "customer", href: "/app/customers", fields: ["displayName", "email", "phone", "latestIntent", "source"] },
  { name: "conversations", type: "conversation", href: "/app/inbox", fields: ["status", "latestIntent", "channel", "visitorSessionId"] },
  { name: "knowledgeSources", type: "knowledge", href: "/app/knowledge", fields: ["title", "content", "status"] },
  { name: "aiAssets", type: "ai_asset", href: "/app/ai-assets", fields: ["title", "provider", "type", "externalId", "status"] },
  { name: "integrations", type: "integration", href: "/app/integrations", fields: ["provider", "status", "accountLabel"] },
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const workspaceId = getPathParam(req, "workspaceId");
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });

  const ctx = await requireWorkspaceRole(req, res, workspaceId, "viewer");
  if (!ctx) return;

  const raw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const q = (raw ?? "").trim().toLowerCase();
  if (q.length < 2) return res.status(200).json({ query: q, results: [] });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: "database_not_configured" });

  try {
    const rateLimit = await checkRateLimit(workspaceId, `${workspaceId}:search:${ctx.uid}`, 60);
    if (!rateLimit.allowed) return res.status(429).json({ error: "rate_limited" });

    const workspace = db.collection("workspaces").doc(workspaceId);
    const snapshots = await Promise.all(
      COLLECTIONS.map((collectionDef) =>
        workspace.collection(collectionDef.name).orderBy("updatedAt", "desc").limit(25).get()
      )
    );

    const results: SearchResult[] = [];
    snapshots.forEach((snapshot, index) => {
      const collectionDef = COLLECTIONS[index];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const haystack = collectionDef.fields.map((field) => valueToSearch(data[field])).join(" ").toLowerCase();
        if (!haystack.includes(q)) return;
        results.push({
          id: doc.id,
          type: collectionDef.type,
          title: titleForResult(collectionDef.type, data, doc.id),
          subtitle: subtitleForResult(collectionDef.type, data),
          href: collectionDef.type === "customer" ? `/app/customers/${doc.id}` : collectionDef.href,
        });
      });
    });

    return res.status(200).json({ query: q, results: results.slice(0, 20) });
  } catch (error) {
    return safeServerError(res, "GET /api/workspaces/:id/search", error);
  }
}

function valueToSearch(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToSearch).join(" ");
  return "";
}

function titleForResult(type: SearchResult["type"], data: DocumentData, id: string): string {
  if (type === "lead") return String(data.name || data.email || data.phone || `Lead ${id.slice(-6)}`);
  if (type === "customer") return String(data.displayName || data.email || data.phone || `Customer ${id.slice(-6)}`);
  if (type === "conversation") return `Conversation ${id.slice(-6)}`;
  if (type === "knowledge") return String(data.title || `Knowledge ${id.slice(-6)}`);
  if (type === "ai_asset") return String(data.title || `AI asset ${id.slice(-6)}`);
  return String(data.provider || `Integration ${id.slice(-6)}`);
}

function subtitleForResult(type: SearchResult["type"], data: DocumentData): string {
  if (type === "lead") return String(data.status || data.intent || "Lead");
  if (type === "customer") return String(data.latestIntent || data.source || "Customer");
  if (type === "conversation") return String(data.status || "Conversation");
  if (type === "knowledge") return String(data.status || "Knowledge");
  if (type === "ai_asset") return [data.provider, data.type, data.status].filter(Boolean).join(" · ") || "AI asset";
  return String(data.status || "Integration");
}
