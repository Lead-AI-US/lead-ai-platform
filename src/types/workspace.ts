import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type WorkspaceStatus = "onboarding" | "testing" | "active" | "suspended";

/** Firestore path: workspaces/{workspaceId} */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  timezone: string;
  businessType?: string;
  primaryGoal?: string;
  websiteDomain?: string;

  /** Locator embedded in the public chat widget snippet. Not a secret. */
  publicWidgetKey: string;
  /** Origins the public chat widget API will accept requests from. */
  allowedOrigins: string[];

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  createdBy: string;
}

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceMemberStatus = "active" | "disabled";

/** Firestore path: workspaceMembers/{workspaceId}_{uid} */
export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  createdAt: IsoTimestamp;
}

export function workspaceMemberDocId(workspaceId: string, userId: string): string {
  return `${workspaceId}_${userId}`;
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** True if `role` grants at least `minimum` privilege. */
export function roleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
