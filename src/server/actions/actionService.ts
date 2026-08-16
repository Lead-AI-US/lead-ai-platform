import { getAdminDb } from "@/lib/firebase/admin.js";
import { recordAuditEvent } from "@/lib/audit/log.js";
import { recordEvent } from "@/server/events/eventService.js";
import type { AgentAction } from "@/types/action.js";
import type { WorkspaceAuthContext } from "@/lib/auth/serverAuth.js";
import { parseActionProposal, type ActionProposal } from "./actionSchema.js";
import { evaluateActionPolicy, type ActionPolicyDecision } from "./actionPolicy.js";
import { classifyActionRisk } from "./actionRisk.js";
import { executeAction, type ActionExecutionResult } from "./actionExecutor.js";

export interface ProposeActionResult {
  action: AgentAction;
  policy: ActionPolicyDecision;
  execution?: ActionExecutionResult;
}

export async function proposeAction(params: {
  input: unknown;
  auth: WorkspaceAuthContext;
  dryRun?: boolean;
}): Promise<ProposeActionResult> {
  const proposal = parseActionProposal(params.input);

  if (proposal.workspaceId !== params.auth.workspaceId) {
    throw Object.assign(new Error("Workspace mismatch"), { code: "WORKSPACE_FORBIDDEN" });
  }

  const db = getAdminDb();
  if (!db) throw Object.assign(new Error("Database not configured"), { code: "DATABASE_NOT_CONFIGURED" });

  const risk = classifyActionRisk(proposal.type);
  const existingCompletedAction = await findCompletedActionByIdempotencyKey(proposal.workspaceId, proposal.idempotencyKey);
  const targetExists = await targetExistsForProposal(proposal);
  const approvalGranted = proposal.approvedBy === params.auth.uid;
  const policy = evaluateActionPolicy({
    proposal,
    actorRole: params.auth.role,
    risk,
    existingCompletedAction,
    targetExists,
    approvalGranted,
  });

  const now = new Date().toISOString();
  const actionRef = db.collection("workspaces").doc(proposal.workspaceId).collection("agentActions").doc();
  const action: AgentAction = {
    id: actionRef.id,
    workspaceId: proposal.workspaceId,
    type: proposal.type,
    status: policy.allowed ? "validated" : policy.requiresApproval ? "pending_approval" : "failed",
    risk,
    customerId: proposal.customerId,
    leadId: "leadId" in proposal ? proposal.leadId : undefined,
    conversationId: proposal.conversationId,
    sourceEventId: proposal.sourceEventId,
    automationRunId: proposal.automationRunId,
    idempotencyKey: proposal.idempotencyKey,
    proposedBy: proposal.proposedBy,
    rationale: proposal.rationale,
    requiresApproval: policy.requiresApproval,
    approvedBy: proposal.approvedBy,
    createdAt: now,
    updatedAt: now,
    failureCode: policy.allowed ? undefined : policy.code,
    payload: sanitizeActionPayload(proposal.payload),
  };

  if (!params.dryRun) {
    await actionRef.set({ ...action });
    await recordEvent({
      workspaceId: action.workspaceId,
      type: "agent_action_proposed",
      customerId: action.customerId,
      leadId: action.leadId,
      conversationId: action.conversationId,
      agentActionId: action.id,
      sourceEventId: action.sourceEventId,
      automationRunId: action.automationRunId,
      actor: { type: action.proposedBy.type === "automation" ? "automation" : "user", id: params.auth.uid },
      metadata: { status: action.status, reason: action.rationale ?? null },
    });

    await recordEvent({
      workspaceId: action.workspaceId,
      type: policy.allowed ? "agent_action_validated" : policy.requiresApproval ? "agent_action_approval_required" : "agent_action_failed",
      customerId: action.customerId,
      leadId: action.leadId,
      conversationId: action.conversationId,
      agentActionId: action.id,
      sourceEventId: action.sourceEventId,
      automationRunId: action.automationRunId,
      actor: { type: "system" },
      metadata: { status: action.status, reason: policy.reason ?? null },
    });
  }

  if (!policy.allowed || params.dryRun) return { action, policy };

  await actionRef.update({ status: "executing", updatedAt: new Date().toISOString() });
  await recordEvent({
    workspaceId: action.workspaceId,
    type: "agent_action_started",
    customerId: action.customerId,
    leadId: action.leadId,
    conversationId: action.conversationId,
    agentActionId: action.id,
    sourceEventId: action.sourceEventId,
    automationRunId: action.automationRunId,
    actor: { type: "system" },
    metadata: { status: "executing" },
  });

  const execution = await executeAction({ db, action, proposal, actorUid: params.auth.uid });
  const completedAt = new Date().toISOString();
  await actionRef.update({
    status: execution.ok ? "completed" : "failed",
    completedAt,
    updatedAt: completedAt,
    failureCode: execution.failureCode,
  });
  await recordAuditEvent({
    workspaceId: action.workspaceId,
    event: execution.ok ? "agent_action_executed" : "agent_action_failed",
    actorUid: params.auth.uid,
    detail: { actionId: action.id, type: action.type, status: execution.ok ? "completed" : "failed" },
  });
  await recordEvent({
    workspaceId: action.workspaceId,
    type: execution.ok ? "agent_action_completed" : "agent_action_failed",
    customerId: action.customerId,
    leadId: action.leadId,
    conversationId: action.conversationId,
    agentActionId: action.id,
    sourceEventId: action.sourceEventId,
    automationRunId: action.automationRunId,
    actor: { type: "system" },
    metadata: { status: execution.ok ? "completed" : "failed", reason: execution.message },
  });

  return { action: { ...action, status: execution.ok ? "completed" : "failed", completedAt }, policy, execution };
}

async function findCompletedActionByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<AgentAction | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("agentActions")
    .where("idempotencyKey", "==", idempotencyKey)
    .where("status", "==", "completed")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as AgentAction);
}

async function targetExistsForProposal(proposal: ActionProposal): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const workspace = db.collection("workspaces").doc(proposal.workspaceId);
  if (proposal.type === "create_lead") return (await workspace.get()).exists;
  if ("leadId" in proposal && proposal.leadId) return (await workspace.collection("leads").doc(proposal.leadId).get()).exists;
  if ("conversationId" in proposal && proposal.conversationId) return (await workspace.collection("conversations").doc(proposal.conversationId).get()).exists;
  if ("customerId" in proposal && proposal.customerId) return (await workspace.collection("customers").doc(proposal.customerId).get()).exists;
  return false;
}

function sanitizeActionPayload(payload: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/(authorization|cookie|token|secret|password|private|credential|key)/i.test(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) safe[key] = value;
  }
  return safe;
}
