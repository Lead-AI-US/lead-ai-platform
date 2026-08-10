import { readFileSync } from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Real Firestore Security Rules tests against the Firestore emulator (not a
 * hand-rolled simulation of what the rules "should" do). Requires the
 * emulator running: `firebase emulators:start --only firestore` (see
 * docs/LOCAL_DEVELOPMENT.md). Run via `npm run test:rules`.
 *
 * These are release blockers per docs/QUALITY_CHECKLIST.md: workspace A's
 * user must never be able to read workspace B's data, and vice versa.
 */

const WORKSPACE_A = "ws_a";
const WORKSPACE_B = "ws_b";
const USER_A = "user_a";
const USER_B = "user_b";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-lead-ai-platform",
    firestore: {
      rules: readFileSync("firebase/firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = new Date().toISOString();

    await setDoc(doc(db, "workspaces", WORKSPACE_A), {
      id: WORKSPACE_A,
      name: "Workspace A",
      allowedOrigins: [],
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B), {
      id: WORKSPACE_B,
      name: "Workspace B",
      allowedOrigins: [],
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "workspaceMembers", `${WORKSPACE_A}_${USER_A}`), {
      workspaceId: WORKSPACE_A,
      userId: USER_A,
      role: "owner",
      status: "active",
      createdAt: now,
    });
    await setDoc(doc(db, "workspaceMembers", `${WORKSPACE_B}_${USER_B}`), {
      workspaceId: WORKSPACE_B,
      userId: USER_B,
      role: "owner",
      status: "active",
      createdAt: now,
    });

    await setDoc(doc(db, "workspaces", WORKSPACE_A, "leads", "lead_a1"), {
      id: "lead_a1",
      workspaceId: WORKSPACE_A,
      source: "manual",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B, "leads", "lead_b1"), {
      id: "lead_b1",
      workspaceId: WORKSPACE_B,
      source: "manual",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  });
});

describe("Firestore rules — tenant isolation (release blocker)", () => {
  it("Workspace A user can read Workspace A's own workspace doc and leads", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A)));
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A, "leads", "lead_a1")));
  });

  it("Workspace A user CANNOT read Workspace B's workspace doc", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B)));
  });

  it("Workspace A user CANNOT read Workspace B's leads", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B, "leads", "lead_b1")));
  });

  it("Workspace B user CANNOT read Workspace A's leads (symmetric check)", async () => {
    const db = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_A, "leads", "lead_a1")));
  });

  it("Unauthenticated user CANNOT read any workspace's private data", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_A)));
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_A, "leads", "lead_a1")));
  });

  it("Client CANNOT write leads directly, even in their own workspace (must go through the API)", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "leads", "lead_a2"), {
        id: "lead_a2",
        workspaceId: WORKSPACE_A,
        source: "manual",
        status: "new",
      })
    );
  });

  it("Client CANNOT read another user's users/{uid} profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", USER_B), {
        uid: USER_B,
        email: "b@example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, "users", USER_B)));
  });
});
