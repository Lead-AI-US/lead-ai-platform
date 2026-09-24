import type { Firestore } from "firebase-admin/firestore";
import { workspaceMemberDocId, type WorkspaceMember, type WorkspaceRole } from "@/types/workspace.js";
import { wouldRemoveLastOwner } from "./memberPolicy.js";

export interface MemberPatch {
  role?: WorkspaceRole;
  status?: "active" | "disabled";
}

export type MemberUpdateResult =
  | { code: "member_not_found" }
  | { code: "forbidden" }
  | { code: "last_owner" }
  | { code: "ok"; target: WorkspaceMember; patch: MemberPatch };

/**
 * The one place that atomically applies a role/status change to a
 * workspaceMembers doc while enforcing "never remove the last active
 * owner." Used by both the admin-driven PATCH /members/:userId route and
 * the self-service POST /leave route, so the safety property (and its
 * test coverage) lives in exactly one place instead of being duplicated
 * per call site.
 *
 * Read-check-write done as three separate Firestore calls has a real
 * race: two concurrent updates touching two DIFFERENT owners of a
 * 2-owner workspace could each see "the other owner is still active" and
 * both commit, leaving zero owners. Wrapping the target-doc read, the
 * owner-count query, and the write in a single transaction makes Firestore
 * serialize any concurrent transaction that touches the same documents —
 * one succeeds, the other is retried against the now-updated state and
 * correctly rejected. See memberService.integration.test.ts.
 */
export async function applyMemberUpdate(params: {
  db: Firestore;
  workspaceId: string;
  targetUserId: string;
  patch: MemberPatch;
  /** Return false to reject with "forbidden" before any write is attempted. Omit to skip (e.g. self-service leave, which is always authorized on one's own membership). */
  authorize?: (target: WorkspaceMember) => boolean;
}): Promise<MemberUpdateResult> {
  const { db, workspaceId, targetUserId, patch, authorize } = params;
  const ref = db.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceId, targetUserId));
  const ownersQuery = db
    .collection("workspaceMembers")
    .where("workspaceId", "==", workspaceId)
    .where("role", "==", "owner")
    .where("status", "==", "active");

  return db.runTransaction(async (tx): Promise<MemberUpdateResult> => {
    const doc = await tx.get(ref);
    if (!doc.exists) return { code: "member_not_found" };
    const target = doc.data() as WorkspaceMember;

    if (authorize && !authorize(target)) return { code: "forbidden" };

    const wasActiveOwner = target.role === "owner" && target.status === "active";
    if (wasActiveOwner) {
      const ownersSnapshot = await tx.get(ownersQuery);
      const remainingActiveOwners = ownersSnapshot.docs.filter((d) => d.id !== ref.id).length;
      if (wouldRemoveLastOwner({ targetWasActiveOwner: true, remainingActiveOwners, nextRole: patch.role, nextStatus: patch.status })) {
        return { code: "last_owner" };
      }
    }

    tx.update(ref, { ...patch });
    return { code: "ok", target, patch };
  });
}
