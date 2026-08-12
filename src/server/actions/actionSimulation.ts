import { parseActionProposal } from "./actionSchema.js";
import { classifyActionRisk } from "./actionRisk.js";
import { evaluateActionPolicy } from "./actionPolicy.js";
import type { WorkspaceRole } from "@/types/workspace.js";

export function simulateAction(params: { input: unknown; actorRole: WorkspaceRole; targetExists?: boolean; approvalGranted?: boolean }) {
  try {
    const proposal = parseActionProposal(params.input);
    const risk = classifyActionRisk(proposal.type);
    const policy = evaluateActionPolicy({
      proposal,
      actorRole: params.actorRole,
      risk,
      targetExists: params.targetExists ?? true,
      approvalGranted: params.approvalGranted,
    });

    return {
      schemaValid: true,
      supported: true,
      risk,
      allowed: policy.allowed,
      requiresApproval: policy.requiresApproval,
      reason: policy.reason,
      code: policy.code,
      expectedEffects: expectedEffects(proposal.type),
    };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "ACTION_INVALID_STATE";
    return {
      schemaValid: false,
      supported: code !== "ACTION_NOT_SUPPORTED",
      allowed: false,
      requiresApproval: false,
      reason: code === "ACTION_NOT_SUPPORTED" ? "Unsupported action type" : "Invalid action schema",
      code: code === "ACTION_NOT_SUPPORTED" ? "ACTION_NOT_SUPPORTED" : "ACTION_INVALID_STATE",
      expectedEffects: [],
    };
  }
}

function expectedEffects(type: string): string[] {
  const effects: Record<string, string[]> = {
    create_lead: ["Create one lead", "Record lead_created and agent_action_completed events"],
    update_lead_stage: ["Update one lead status", "Record lead stage event and audit entry"],
    request_handoff: ["Set one conversation to needs_human", "Record handoff event and audit entry"],
    schedule_followup: ["Set one lead next action", "Record follow-up scheduled event"],
    add_customer_tag: ["Add one customer tag", "Record agent action event"],
    create_internal_note: ["Create one internal note under the customer", "Record agent action event"],
  };
  return effects[type] ?? ["No supported effects"];
}
