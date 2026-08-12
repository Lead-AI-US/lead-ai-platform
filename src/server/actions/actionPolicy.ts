import type { WorkspaceRole } from "@/types/workspace.js";
import type { AgentAction, ActionRisk } from "@/types/action.js";
import type { ActionProposal } from "./actionSchema.js";

export type ActionPolicyCode =
  | "ACTION_NOT_SUPPORTED"
  | "ACTION_POLICY_DENIED"
  | "ACTION_APPROVAL_REQUIRED"
  | "ACTION_ALREADY_COMPLETED"
  | "ACTION_INVALID_STATE";

export interface ActionPolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  code?: ActionPolicyCode;
}

export function roleCanProposeAction(role: WorkspaceRole, risk: ActionRisk): boolean {
  if (role === "owner" || role === "admin") return true;
  if (role === "member") return risk !== "high";
  return risk === "low";
}

export function evaluateActionPolicy(params: {
  proposal: ActionProposal;
  actorRole: WorkspaceRole;
  risk: ActionRisk;
  existingCompletedAction?: AgentAction | null;
  targetExists: boolean;
  approvalGranted?: boolean;
}): ActionPolicyDecision {
  if (params.existingCompletedAction?.status === "completed") {
    return {
      allowed: false,
      requiresApproval: false,
      code: "ACTION_ALREADY_COMPLETED",
      reason: "An action with this idempotency key has already completed.",
    };
  }

  if (!roleCanProposeAction(params.actorRole, params.risk)) {
    return {
      allowed: false,
      requiresApproval: false,
      code: "ACTION_POLICY_DENIED",
      reason: "The actor does not have permission to propose this action.",
    };
  }

  if (params.proposal.type !== "create_lead" && !params.targetExists) {
    return {
      allowed: false,
      requiresApproval: false,
      code: "ACTION_INVALID_STATE",
      reason: "The target entity was not found in this workspace.",
    };
  }

  const requiresApproval = params.risk !== "low";
  if (requiresApproval && !params.approvalGranted) {
    return {
      allowed: false,
      requiresApproval: true,
      code: "ACTION_APPROVAL_REQUIRED",
      reason: "This action requires human approval before execution.",
    };
  }

  return { allowed: true, requiresApproval };
}
