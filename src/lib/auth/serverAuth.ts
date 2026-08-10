/**
 * Server-side request authorization — SERVER ONLY (api/*.ts).
 *
 * Flow: Authorization: Bearer <Firebase ID token>
 *         -> Firebase Admin verifyIdToken()
 *         -> workspaceMembers/{workspaceId}_{uid} lookup
 *         -> role check
 *
 * Every function fails closed: on any missing config, missing/invalid
 * token, missing membership, disabled membership, or insufficient role, it
 * writes the appropriate HTTP response itself and returns null. Callers
 * must treat a null return as "already responded, stop processing" -
 * never fall through and read/write data anyway.
 *
 * Role/membership is ALWAYS derived from the workspaceMembers collection on
 * the server. Never trust a role, workspace id, or "is owner" flag sent by
 * the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb } from "../firebase/admin.js";
import {
  roleAtLeast,
  workspaceMemberDocId,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../../types/workspace.js";

export interface AuthedUser {
  uid: string;
  email: string | null;
}

export async function requireFirebaseUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthedUser | null> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    res.status(503).json({ error: "auth_not_configured" });
    return null;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    res.status(401).json({ error: "invalid_token" });
    return null;
  }
}

export interface WorkspaceAuthContext extends AuthedUser {
  workspaceId: string;
  role: WorkspaceRole;
}

export async function requireWorkspaceMembership(
  req: VercelRequest,
  res: VercelResponse,
  workspaceId: string
): Promise<WorkspaceAuthContext | null> {
  const user = await requireFirebaseUser(req, res);
  if (!user) return null;

  if (!workspaceId) {
    res.status(400).json({ error: "workspace_id_required" });
    return null;
  }

  const db = getAdminDb();
  if (!db) {
    res.status(503).json({ error: "database_not_configured" });
    return null;
  }

  const memberDoc = await db
    .collection("workspaceMembers")
    .doc(workspaceMemberDocId(workspaceId, user.uid))
    .get();

  if (!memberDoc.exists) {
    res.status(403).json({ error: "not_a_workspace_member" });
    return null;
  }

  const member = memberDoc.data() as WorkspaceMember;
  if (member.status !== "active") {
    res.status(403).json({ error: "membership_disabled" });
    return null;
  }

  return { ...user, workspaceId, role: member.role };
}

export async function requireWorkspaceRole(
  req: VercelRequest,
  res: VercelResponse,
  workspaceId: string,
  minimumRole: WorkspaceRole
): Promise<WorkspaceAuthContext | null> {
  const ctx = await requireWorkspaceMembership(req, res, workspaceId);
  if (!ctx) return null;

  if (!roleAtLeast(ctx.role, minimumRole)) {
    res.status(403).json({ error: "insufficient_role", required: minimumRole });
    return null;
  }

  return ctx;
}
