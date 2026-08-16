import type { ActionRisk, AgentActionType } from "@/types/action.js";

const RISK_BY_ACTION: Record<AgentActionType, ActionRisk> = {
  create_lead: "low",
  request_handoff: "low",
  add_customer_tag: "low",
  create_internal_note: "low",
  update_lead_stage: "medium",
  schedule_followup: "medium",
  request_booking: "high",
};

export function classifyActionRisk(type: AgentActionType): ActionRisk {
  return RISK_BY_ACTION[type] ?? "high";
}

export function requiresApprovalForRisk(risk: ActionRisk): boolean {
  return risk !== "low";
}
