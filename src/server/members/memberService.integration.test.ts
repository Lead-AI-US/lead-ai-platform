import { describe, expect, it } from "vitest";
import { getAdminDb } from "@/lib/firebase/admin.js";
import { workspaceMemberDocId, type WorkspaceMember } from "@/types/workspace.js";
import { applyMemberUpdate } from "./memberService.js";

const db = getAdminDb();
if (!db) {
  throw new Error(
    "getAdminDb() returned null — is FIRESTORE_EMULATOR_HOST set (see .env.local) and the emulator running? " +
      "npx firebase emulators:start --only firestore (see docs/LOCAL_DEVELOPMENT.md)."
  );
}

// A fresh workspace id per test (not a shared module-level constant) —
// otherwise an "only active owner" assertion in one test would silently
// pass or fail depending on leftover owners another test created in the
// same workspace, since the owner-count query is workspace-scoped.
function freshWorkspaceId(label: string): string {
  return `ws_member_service_${label}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function seedMember(workspaceId: string, userId: string, role: WorkspaceMember["role"], status: WorkspaceMember["status"] = "active") {
  const member: WorkspaceMember = { workspaceId, userId, role, status, createdAt: new Date().toISOString() };
  await db!.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceId, userId)).set(member);
}

async function getMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
  const doc = await db!.collection("workspaceMembers").doc(workspaceMemberDocId(workspaceId, userId)).get();
  return doc.data() as WorkspaceMember;
}

describe("applyMemberUpdate — real Firestore emulator", () => {
  it("demotes a non-last owner successfully", async () => {
    const workspaceId = freshWorkspaceId("demote-non-last");
    await seedMember(workspaceId, "owner_a", "owner");
    await seedMember(workspaceId, "owner_b", "owner");

    const result = await applyMemberUpdate({ db: db!, workspaceId, targetUserId: "owner_a", patch: { role: "admin" } });
    expect(result.code).toBe("ok");
    expect((await getMember(workspaceId, "owner_a")).role).toBe("admin");
  });

  it("rejects demoting the workspace's only active owner", async () => {
    const workspaceId = freshWorkspaceId("demote-sole");
    await seedMember(workspaceId, "sole_owner", "owner");

    const result = await applyMemberUpdate({ db: db!, workspaceId, targetUserId: "sole_owner", patch: { role: "admin" } });
    expect(result.code).toBe("last_owner");
    expect((await getMember(workspaceId, "sole_owner")).role).toBe("owner");
  });

  it("rejects disabling the workspace's only active owner", async () => {
    const workspaceId = freshWorkspaceId("disable-sole");
    await seedMember(workspaceId, "sole_owner", "owner");

    const result = await applyMemberUpdate({ db: db!, workspaceId, targetUserId: "sole_owner", patch: { status: "disabled" } });
    expect(result.code).toBe("last_owner");
    expect((await getMember(workspaceId, "sole_owner")).status).toBe("active");
  });

  it(
    "CONCURRENCY: two simultaneous demotions of two different owners in a 2-owner workspace never both succeed",
    async () => {
      const workspaceId = freshWorkspaceId("race");
      await seedMember(workspaceId, "owner_a", "owner");
      await seedMember(workspaceId, "owner_b", "owner");

      // Fired together, not awaited sequentially — this is the actual race:
      // a non-transactional read-check-write would let both requests read
      // "the other owner is still active" before either write lands.
      const [resultA, resultB] = await Promise.all([
        applyMemberUpdate({ db: db!, workspaceId, targetUserId: "owner_a", patch: { role: "admin" } }),
        applyMemberUpdate({ db: db!, workspaceId, targetUserId: "owner_b", patch: { role: "admin" } }),
      ]);

      const codes = [resultA.code, resultB.code].sort();
      // Exactly one demotion must win and one must be rejected as the
      // last-owner attempt -- never "ok"/"ok" (which would leave the
      // workspace with zero owners) and never "last_owner"/"last_owner"
      // (which would incorrectly block a legitimate demotion).
      expect(codes).toEqual(["last_owner", "ok"]);

      const [memberA, memberB] = await Promise.all([getMember(workspaceId, "owner_a"), getMember(workspaceId, "owner_b")]);
      const activeOwners = [memberA, memberB].filter((m) => m.role === "owner" && m.status === "active");
      expect(activeOwners).toHaveLength(1);
    },
    20000
  );

  it("authorize callback can reject before any write (admin touching another admin)", async () => {
    const workspaceId = freshWorkspaceId("authz");
    await seedMember(workspaceId, "owner", "owner");
    await seedMember(workspaceId, "other_admin", "admin");

    const result = await applyMemberUpdate({
      db: db!,
      workspaceId,
      targetUserId: "other_admin",
      patch: { role: "member" },
      authorize: () => false, // simulates canManageMemberRole("admin", "admin", "member") === false
    });
    expect(result.code).toBe("forbidden");
    expect((await getMember(workspaceId, "other_admin")).role).toBe("admin");
  });

  it("returns member_not_found for a nonexistent membership", async () => {
    const workspaceId = freshWorkspaceId("not-found");
    const result = await applyMemberUpdate({ db: db!, workspaceId, targetUserId: "does_not_exist", patch: { role: "admin" } });
    expect(result.code).toBe("member_not_found");
  });
});
