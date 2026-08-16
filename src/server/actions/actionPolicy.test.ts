import { describe, expect, it } from "vitest";
import { classifyActionRisk, requiresApprovalForRisk } from "./actionRisk";
import { evaluateActionPolicy } from "./actionPolicy";

const proposal = {
  type: "schedule_followup",
  workspaceId: "ws_1",
  leadId: "lead_1",
  idempotencyKey: "lead_1:schedule_followup",
  proposedBy: { type: "user", id: "user_1" },
  payload: { nextAction: "Call customer", nextActionAt: "2026-09-01T15:00:00.000Z" },
} as const;

describe("action risk", () => {
  it("classifies phase 2 supported actions deterministically", () => {
    expect(classifyActionRisk("create_lead")).toBe("low");
    expect(classifyActionRisk("schedule_followup")).toBe("medium");
    expect(classifyActionRisk("request_booking")).toBe("high");
    expect(requiresApprovalForRisk("high")).toBe(true);
  });
});

describe("evaluateActionPolicy", () => {
  it("requires approval for medium-risk actions", () => {
    const decision = evaluateActionPolicy({
      proposal,
      actorRole: "member",
      risk: "medium",
      targetExists: true,
    });
    expect(decision).toMatchObject({ allowed: false, requiresApproval: true, code: "ACTION_APPROVAL_REQUIRED" });
  });

  it("denies duplicate completed actions", () => {
    const decision = evaluateActionPolicy({
      proposal,
      actorRole: "admin",
      risk: "medium",
      targetExists: true,
      approvalGranted: true,
      existingCompletedAction: {
        id: "action_1",
        workspaceId: "ws_1",
        type: "schedule_followup",
        status: "completed",
        risk: "medium",
        idempotencyKey: "lead_1:schedule_followup",
        proposedBy: { type: "user" },
        requiresApproval: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(decision.code).toBe("ACTION_ALREADY_COMPLETED");
  });
});
