import { getAdminDb } from "@/lib/firebase/admin.js";
import { recordAuditEvent } from "@/lib/audit/log.js";
import { recordEvent } from "@/server/events/eventService.js";
import { proposeAction } from "@/server/actions/actionService.js";
import type { WorkspaceAuthContext } from "@/lib/auth/serverAuth.js";
import type { Automation, AutomationRun, AutomationAction } from "@/types/automation.js";
import type { BusinessEvent } from "@/types/event.js";
import { automationMatchesTrigger } from "./triggerMatcher.js";
import { evaluateAutomationConditions } from "./conditionEvaluator.js";

export interface AutomationRunResult {
  run: AutomationRun;
  actionIds: string[];
}

export async function runAutomationForEvent(params: {
  automation: Automation;
  event: BusinessEvent;
  auth: WorkspaceAuthContext;
}): Promise<AutomationRunResult> {
  const db = getAdminDb();
  if (!db) throw new Error("database_not_configured");

  const now = new Date().toISOString();
  const runId = `${params.automation.id}_${params.event.id}`;
  const runRef = db.collection("workspaces").doc(params.automation.workspaceId).collection("automationRuns").doc(runId);
  const existing = await runRef.get();
  if (existing.exists) {
    return { run: existing.data() as AutomationRun, actionIds: [] };
  }

  if (!automationMatchesTrigger(params.automation, params.event)) {
    const run = createRun(params.automation, params.event, "skipped", "AUTOMATION_CONDITION_FAILED", now);
    await runRef.set({ ...run });
    return { run, actionIds: [] };
  }

  if (!evaluateAutomationConditions(params.automation.conditions, params.event)) {
    const run = createRun(params.automation, params.event, "skipped", "AUTOMATION_CONDITION_FAILED", now);
    await runRef.set({ ...run });
    return { run, actionIds: [] };
  }

  const run = createRun(params.automation, params.event, "running", undefined, now);
  await runRef.set({ ...run });
  await recordEvent({
    workspaceId: params.automation.workspaceId,
    type: "automation_started",
    customerId: params.event.customerId,
    leadId: params.event.leadId,
    conversationId: params.event.conversationId,
    sourceEventId: params.event.id,
    automationRunId: run.id,
    actor: { type: "automation", id: params.automation.id },
    metadata: { status: "running" },
  });

  const actionIds: string[] = [];
  let completed = 0;
  for (const action of params.automation.actions) {
    const proposal = proposalFromAutomationAction(action, params.automation, params.event, run.id);
    const result = await proposeAction({ input: proposal, auth: params.auth, dryRun: false });
    actionIds.push(result.action.id);
    if (result.execution?.ok || result.action.status === "completed") completed++;
  }

  const status = completed === params.automation.actions.length ? "completed" : completed > 0 ? "partial" : "failed";
  const completedAt = new Date().toISOString();
  const patch = {
    status,
    actionsAttempted: params.automation.actions.length,
    actionsCompleted: completed,
    failureCode: status === "completed" ? undefined : "AUTOMATION_EXECUTION_FAILED",
    completedAt,
  } satisfies Partial<AutomationRun>;
  await runRef.update(patch);
  const finalRun: AutomationRun = { ...run, ...patch };

  await recordAuditEvent({
    workspaceId: params.automation.workspaceId,
    event: status === "completed" ? "automation_run_completed" : "automation_run_failed",
    actorUid: params.auth.uid,
    detail: { automationId: params.automation.id, runId: run.id, status },
  });
  await recordEvent({
    workspaceId: params.automation.workspaceId,
    type: status === "completed" ? "automation_completed" : "automation_failed",
    customerId: params.event.customerId,
    leadId: params.event.leadId,
    conversationId: params.event.conversationId,
    sourceEventId: params.event.id,
    automationRunId: run.id,
    actor: { type: "automation", id: params.automation.id },
    metadata: { status },
  });

  return { run: finalRun, actionIds };
}

function createRun(
  automation: Automation,
  event: BusinessEvent,
  status: AutomationRun["status"],
  failureCode: AutomationRun["failureCode"],
  now: string
): AutomationRun {
  return {
    id: `${automation.id}_${event.id}`,
    workspaceId: automation.workspaceId,
    automationId: automation.id,
    sourceEventId: event.id,
    status,
    actionsAttempted: 0,
    actionsCompleted: 0,
    failureCode,
    retryCount: 0,
    startedAt: now,
    completedAt: status === "running" ? undefined : now,
  };
}

function proposalFromAutomationAction(action: AutomationAction, automation: Automation, event: BusinessEvent, runId: string) {
  return {
    type: action.type,
    workspaceId: automation.workspaceId,
    customerId: event.customerId,
    leadId: event.leadId,
    conversationId: event.conversationId,
    sourceEventId: event.id,
    automationRunId: runId,
    idempotencyKey: `${automation.id}:${event.id}:${action.type}`,
    proposedBy: { type: "automation", id: automation.id },
    rationale: `Automation ${automation.name}`,
    approvedBy: action.type === "schedule_followup" || action.type === "update_lead_stage" ? undefined : undefined,
    payload: action.config,
  };
}
