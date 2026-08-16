import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { recordAuditEvent } from "@/lib/audit/log.js";
import { recordEvent } from "@/server/events/eventService.js";
import type { AgentAction } from "@/types/action.js";
import type { Lead } from "@/types/lead.js";
import type { ActionProposal } from "./actionSchema.js";

export interface ActionExecutionResult {
  ok: boolean;
  message: string;
  entityId?: string;
  failureCode?: AgentAction["failureCode"];
}

export async function executeAction(params: {
  db: Firestore;
  action: AgentAction;
  proposal: ActionProposal;
  actorUid: string;
}): Promise<ActionExecutionResult> {
  const { db, action, proposal, actorUid } = params;
  switch (proposal.type) {
    case "create_lead":
      return createLead({ db, action, proposal, actorUid });
    case "update_lead_stage":
      return updateLeadStage({ db, action, proposal, actorUid });
    case "request_handoff":
      return requestHandoff({ db, action, proposal, actorUid });
    case "schedule_followup":
      return scheduleFollowup({ db, action, proposal, actorUid });
    case "add_customer_tag":
      return addCustomerTag({ db, action, proposal, actorUid });
    case "create_internal_note":
      return createInternalNote({ db, action, proposal, actorUid });
  }
}

async function createLead({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "create_lead" }>; actorUid: string }) {
  const now = new Date().toISOString();
  const ref = db.collection("workspaces").doc(action.workspaceId).collection("leads").doc();
  const lead: Lead = {
    id: ref.id,
    workspaceId: action.workspaceId,
    source: proposal.payload.source,
    customerId: action.customerId,
    conversationId: action.conversationId,
    name: proposal.payload.name,
    email: proposal.payload.email,
    phone: proposal.payload.phone,
    message: proposal.payload.message,
    status: "new",
    stage: "new",
    intent: proposal.payload.intent,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set({ ...lead });
  await recordEventForAction(action, "lead_created", actorUid, { leadId: ref.id, metadata: { intent: proposal.payload.intent ?? null, source: proposal.payload.source } });
  return { ok: true, message: "Lead created", entityId: ref.id };
}

async function updateLeadStage({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "update_lead_stage" }>; actorUid: string }) {
  const ref = db.collection("workspaces").doc(action.workspaceId).collection("leads").doc(proposal.leadId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: "Lead not found", failureCode: "ACTION_INVALID_STATE" as const };
  await ref.update({
    status: proposal.payload.status,
    stage: mapLeadStatusToStage(proposal.payload.status),
    updatedAt: new Date().toISOString(),
    ...(proposal.payload.nextAction ? { nextAction: proposal.payload.nextAction } : {}),
    ...(proposal.payload.nextActionAt ? { nextActionAt: proposal.payload.nextActionAt } : {}),
  });
  await recordAuditEvent({ workspaceId: action.workspaceId, event: "lead_status_changed", actorUid, detail: { leadId: proposal.leadId, status: proposal.payload.status } });
  await recordEventForAction(action, proposal.payload.status === "qualified" ? "lead_qualified" : "lead_stage_changed", actorUid, {
    metadata: { status: proposal.payload.status, leadStatus: proposal.payload.status },
  });
  return { ok: true, message: "Lead stage updated", entityId: proposal.leadId };
}

async function requestHandoff({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "request_handoff" }>; actorUid: string }) {
  const ref = db.collection("workspaces").doc(action.workspaceId).collection("conversations").doc(proposal.conversationId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: "Conversation not found", failureCode: "ACTION_INVALID_STATE" as const };
  await ref.update({ status: "needs_human", updatedAt: new Date().toISOString() });
  await recordAuditEvent({ workspaceId: action.workspaceId, event: "handoff_requested", actorUid, detail: { conversationId: proposal.conversationId } });
  await recordEventForAction(action, "human_handoff_requested", actorUid, { metadata: { reason: proposal.payload.reason ?? null } });
  return { ok: true, message: "Handoff requested", entityId: proposal.conversationId };
}

async function scheduleFollowup({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "schedule_followup" }>; actorUid: string }) {
  const ref = db.collection("workspaces").doc(action.workspaceId).collection("leads").doc(proposal.leadId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: "Lead not found", failureCode: "ACTION_INVALID_STATE" as const };
  await ref.update({ nextAction: proposal.payload.nextAction, nextActionAt: proposal.payload.nextActionAt, updatedAt: new Date().toISOString() });
  await recordEventForAction(action, "followup_scheduled", actorUid, { metadata: { reason: proposal.payload.nextAction } });
  return { ok: true, message: "Follow-up scheduled", entityId: proposal.leadId };
}

async function addCustomerTag({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "add_customer_tag" }>; actorUid: string }) {
  const ref = db.collection("workspaces").doc(action.workspaceId).collection("customers").doc(proposal.customerId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: "Customer not found", failureCode: "ACTION_INVALID_STATE" as const };
  await ref.update({ tags: FieldValue.arrayUnion(proposal.payload.tag), updatedAt: new Date().toISOString() });
  await recordEventForAction(action, "agent_action_completed", actorUid, { metadata: { reason: `Tag added: ${proposal.payload.tag}` } });
  return { ok: true, message: "Customer tag added", entityId: proposal.customerId };
}

async function createInternalNote({ db, action, proposal, actorUid }: { db: Firestore; action: AgentAction; proposal: Extract<ActionProposal, { type: "create_internal_note" }>; actorUid: string }) {
  const customerRef = db.collection("workspaces").doc(action.workspaceId).collection("customers").doc(proposal.customerId);
  const customer = await customerRef.get();
  if (!customer.exists) return { ok: false, message: "Customer not found", failureCode: "ACTION_INVALID_STATE" as const };
  const noteRef = customerRef.collection("notes").doc();
  await noteRef.set({
    id: noteRef.id,
    workspaceId: action.workspaceId,
    customerId: proposal.customerId,
    content: proposal.payload.note,
    createdBy: actorUid,
    createdAt: new Date().toISOString(),
  });
  await recordEventForAction(action, "agent_action_completed", actorUid, { metadata: { reason: "Internal note created" } });
  return { ok: true, message: "Internal note created", entityId: noteRef.id };
}

async function recordEventForAction(
  action: AgentAction,
  type: Parameters<typeof recordEvent>[0]["type"],
  actorUid: string,
  extra?: { leadId?: string; metadata?: Record<string, unknown> }
) {
  await recordEvent({
    workspaceId: action.workspaceId,
    type,
    customerId: action.customerId,
    leadId: extra?.leadId ?? action.leadId,
    conversationId: action.conversationId,
    agentActionId: action.id,
    sourceEventId: action.sourceEventId,
    automationRunId: action.automationRunId,
    actor: { type: action.proposedBy.type === "automation" ? "automation" : "user", id: actorUid },
    source: { channel: "workspace_app" },
    metadata: extra?.metadata,
  });
}

function mapLeadStatusToStage(status: Lead["status"]): Lead["stage"] {
  if (status === "qualified") return "qualified";
  if (status === "contacted") return "contacted";
  if (status === "closed") return "won";
  return "new";
}
