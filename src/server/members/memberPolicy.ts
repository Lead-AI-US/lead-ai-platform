import type { WorkspaceRole } from "../../types/workspace.js";

/**
 * Only an owner may create, promote to, or modify an "owner" or "admin"
 * membership. An admin may manage "member"/"viewer" only. This is
 * independent of the route's own `requireWorkspaceRole(..., "admin")`
 * gate, which just confirms the caller is at least an admin in the
 * first place.
 */
export function canManageMemberRole(
  callerRole: WorkspaceRole,
  targetCurrentRole: WorkspaceRole,
  requestedRole?: WorkspaceRole
): boolean {
  const touchesPrivilegedRole =
    targetCurrentRole === "owner" ||
    targetCurrentRole === "admin" ||
    requestedRole === "owner" ||
    requestedRole === "admin";
  return touchesPrivilegedRole ? callerRole === "owner" : true;
}

/**
 * A workspace must always keep at least one active owner. `remainingActiveOwners`
 * is the count of active owners OTHER than the member being changed.
 */
export function wouldRemoveLastOwner(params: {
  targetWasActiveOwner: boolean;
  remainingActiveOwners: number;
  nextRole?: WorkspaceRole;
  nextStatus?: "active" | "disabled";
}): boolean {
  if (!params.targetWasActiveOwner || params.remainingActiveOwners > 0) return false;
  const staysOwner = params.nextRole === undefined || params.nextRole === "owner";
  const staysActive = params.nextStatus === undefined || params.nextStatus === "active";
  return !(staysOwner && staysActive);
}
