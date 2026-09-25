import type { IsoTimestamp } from "./firestoreTimestamp.js";
import type { WorkspaceRole } from "./workspace.js";

export type WorkspaceInviteStatus = "pending" | "accepted" | "revoked" | "expired";

/** Firestore path: workspaces/{workspaceId}/invites/{inviteId}. Server-only — never readable by the client SDK (see firebase/firestore.rules); the id itself is the unguessable link token. */
export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceInviteStatus;
  invitedBy: string;
  createdAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
  acceptedAt?: IsoTimestamp;
  acceptedBy?: string;
}
