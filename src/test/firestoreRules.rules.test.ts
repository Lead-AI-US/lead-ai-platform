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
    await setDoc(doc(db, "workspaces", WORKSPACE_A, "customers", "customer_a1"), {
      id: "customer_a1",
      workspaceId: WORKSPACE_A,
      tags: [],
      firstSeenAt: now,
      lastSeenAt: now,
      conversationCount: 1,
      leadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B, "customers", "customer_b1"), {
      id: "customer_b1",
      workspaceId: WORKSPACE_B,
      tags: [],
      firstSeenAt: now,
      lastSeenAt: now,
      conversationCount: 1,
      leadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_A, "events", "event_a1"), {
      id: "event_a1",
      workspaceId: WORKSPACE_A,
      type: "conversation_started",
      actor: { type: "customer" },
      source: { channel: "website" },
      metadata: {},
      occurredAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B, "events", "event_b1"), {
      id: "event_b1",
      workspaceId: WORKSPACE_B,
      type: "conversation_started",
      actor: { type: "customer" },
      source: { channel: "website" },
      metadata: {},
      occurredAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_A, "agentActions", "action_a1"), {
      id: "action_a1",
      workspaceId: WORKSPACE_A,
      type: "create_lead",
      status: "completed",
      risk: "low",
      idempotencyKey: "test-action-a1",
      proposedBy: { type: "ai" },
      requiresApproval: false,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B, "agentActions", "action_b1"), {
      id: "action_b1",
      workspaceId: WORKSPACE_B,
      type: "create_lead",
      status: "completed",
      risk: "low",
      idempotencyKey: "test-action-b1",
      proposedBy: { type: "ai" },
      requiresApproval: false,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_A, "automationRuns", "run_a1"), {
      id: "run_a1",
      workspaceId: WORKSPACE_A,
      automationId: "auto_a1",
      sourceEventId: "event_a1",
      status: "completed",
      actionsAttempted: 1,
      actionsCompleted: 1,
      retryCount: 0,
      startedAt: now,
      completedAt: now,
    });
    await setDoc(doc(db, "workspaces", WORKSPACE_B, "automationRuns", "run_b1"), {
      id: "run_b1",
      workspaceId: WORKSPACE_B,
      automationId: "auto_b1",
      sourceEventId: "event_b1",
      status: "completed",
      actionsAttempted: 1,
      actionsCompleted: 1,
      retryCount: 0,
      startedAt: now,
      completedAt: now,
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

  it("Workspace A user can read own customers and events", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A, "customers", "customer_a1")));
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A, "events", "event_a1")));
  });

  it("Workspace A user CANNOT read Workspace B customers or events", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B, "customers", "customer_b1")));
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B, "events", "event_b1")));
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

  it("Client CANNOT write customer or business event records directly", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "customers", "customer_a2"), {
        id: "customer_a2",
        workspaceId: WORKSPACE_A,
      })
    );
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "events", "event_a2"), {
        id: "event_a2",
        workspaceId: WORKSPACE_A,
        type: "lead_created",
      })
    );
  });

  it("Workspace A user can read own agent actions and automation runs", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A, "agentActions", "action_a1")));
    await assertSucceeds(getDoc(doc(db, "workspaces", WORKSPACE_A, "automationRuns", "run_a1")));
  });

  it("Workspace A user CANNOT read Workspace B agent actions or automation runs", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B, "agentActions", "action_b1")));
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_B, "automationRuns", "run_b1")));
  });

  it("Client CANNOT write agent actions or automation runs directly", async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "agentActions", "action_a2"), {
        id: "action_a2",
        workspaceId: WORKSPACE_A,
        type: "create_lead",
      })
    );
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "automationRuns", "run_a2"), {
        id: "run_a2",
        workspaceId: WORKSPACE_A,
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
