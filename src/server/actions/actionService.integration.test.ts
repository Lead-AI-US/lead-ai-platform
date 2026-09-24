import { beforeAll, describe, expect, it } from "vitest";
import { getAdminDb } from "@/lib/firebase/admin.js";
import { workspaceMemberDocId, type WorkspaceMember } from "@/types/workspace.js";
import type { WorkspaceAuthContext } from "@/lib/auth/serverAuth.js";
import { proposeAction } from "./actionService.js";

const db = getAdminDb();
if (!db) {
  throw new Error(
    "getAdminDb() returned null — is FIRESTORE_EMULATOR_HOST set (see .env.local) and the emulator running? " +
      "npx firebase emulators:start --only firestore (see docs/LOCAL_DEVELOPMENT.md)."
  );
}

const WORKSPACE = `ws_action_service_${Date.now()}`;

async function seedMember(userId: string, role: WorkspaceMember["role"], status: WorkspaceMember["status"] = "active") {
  const member: WorkspaceMember = { workspaceId: WORKSPACE, userId, role, status, createdAt: new Date().toISOString() };
  await db!.collection("workspaceMembers").doc(workspaceMemberDocId(WORKSPACE, userId)).set(member);
}

/** schedule_followup requires its target lead to exist (checked before the approval branch), so every test needs its own. */
async function seedLead(leadId: string) {
  const now = new Date().toISOString();
  await db!
    .collection("workspaces")
    .doc(WORKSPACE)
    .collection("leads")
    .doc(leadId)
    .set({ id: leadId, workspaceId: WORKSPACE, source: "manual", status: "new", createdAt: now, updatedAt: now });
}

function memberAuth(uid: string, role: WorkspaceAuthContext["role"]): WorkspaceAuthContext {
  return { uid, email: `${uid}@example.com`, workspaceId: WORKSPACE, role };
}

/**
 * A "member" may propose a medium-risk action (schedule_followup),
 * which requiresApproval. Real Firestore/emulator only — proves the
 * fix against the actual write path, not a mocked one.
 */
function scheduleFollowupProposal(memberUid: string, leadId: string, approvedBy?: string) {
  return {
    type: "schedule_followup" as const,
    workspaceId: WORKSPACE,
    leadId,
    idempotencyKey: `sched:${leadId}:${Date.now()}:${Math.random()}`,
    proposedBy: { type: "user" as const, id: memberUid },
    payload: { nextAction: "Call to confirm", nextActionAt: new Date(Date.now() + 86_400_000).toISOString() },
    ...(approvedBy ? { approvedBy } : {}),
  };
}

describe("proposeAction — approval authorization, real Firestore emulator", () => {
  beforeAll(async () => {
    await seedLead("lead_1");
  });

  it("a proposer cannot self-approve by naming their own uid", async () => {
    const memberUid = `member_self_${Date.now()}`;
    await seedMember(memberUid, "member");

    const result = await proposeAction({
      input: scheduleFollowupProposal(memberUid, "lead_1", memberUid),
      auth: memberAuth(memberUid, "member"),
      dryRun: true, // isolates the approval decision from execution/target-exists concerns
    });

    expect(result.policy.allowed).toBe(false);
    expect(result.policy.requiresApproval).toBe(true);
    expect(result.policy.code).toBe("ACTION_APPROVAL_REQUIRED");
  });

  it("naming a real, other, active admin as approvedBy grants approval", async () => {
    const memberUid = `member_valid_${Date.now()}`;
    const adminUid = `admin_approver_${Date.now()}`;
    await seedMember(memberUid, "member");
    await seedMember(adminUid, "admin");

    const result = await proposeAction({
      input: scheduleFollowupProposal(memberUid, "lead_1", adminUid),
      auth: memberAuth(memberUid, "member"),
      dryRun: true,
    });

    expect(result.policy.allowed).toBe(true);
    expect(result.policy.requiresApproval).toBe(true);
  });

  it("naming a real member (not admin/owner) as approvedBy does NOT grant approval", async () => {
    const memberUid = `member_a_${Date.now()}`;
    const memberUid2 = `member_b_${Date.now()}`;
    await seedMember(memberUid, "member");
    await seedMember(memberUid2, "member");

    const result = await proposeAction({
      input: scheduleFollowupProposal(memberUid, "lead_1", memberUid2),
      auth: memberAuth(memberUid, "member"),
      dryRun: true,
    });

    expect(result.policy.allowed).toBe(false);
    expect(result.policy.code).toBe("ACTION_APPROVAL_REQUIRED");
  });

  it("naming a nonexistent uid as approvedBy does NOT grant approval", async () => {
    const memberUid = `member_ghost_${Date.now()}`;
    await seedMember(memberUid, "member");

    const result = await proposeAction({
      input: scheduleFollowupProposal(memberUid, "lead_1", "uid_that_does_not_exist"),
      auth: memberAuth(memberUid, "member"),
      dryRun: true,
    });

    expect(result.policy.allowed).toBe(false);
    expect(result.policy.code).toBe("ACTION_APPROVAL_REQUIRED");
  });

  it("naming a disabled admin as approvedBy does NOT grant approval", async () => {
    const memberUid = `member_disabled_admin_${Date.now()}`;
    const disabledAdminUid = `disabled_admin_${Date.now()}`;
    await seedMember(memberUid, "member");
    await seedMember(disabledAdminUid, "admin", "disabled");

    const result = await proposeAction({
      input: scheduleFollowupProposal(memberUid, "lead_1", disabledAdminUid),
      auth: memberAuth(memberUid, "member"),
      dryRun: true,
    });

    expect(result.policy.allowed).toBe(false);
    expect(result.policy.code).toBe("ACTION_APPROVAL_REQUIRED");
  });
});
