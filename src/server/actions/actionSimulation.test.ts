import { describe, expect, it } from "vitest";
import { simulateAction } from "./actionSimulation";

describe("simulateAction", () => {
  it("does not mutate and explains expected effects for valid actions", () => {
    const result = simulateAction({
      actorRole: "admin",
      approvalGranted: true,
      input: {
        type: "schedule_followup",
        workspaceId: "ws_1",
        leadId: "lead_1",
        idempotencyKey: "lead_1:followup:2026-09-01",
        proposedBy: { type: "user", id: "user_1" },
        approvedBy: "user_1",
        payload: { nextAction: "Call customer", nextActionAt: "2026-09-01T15:00:00.000Z" },
      },
    });

    expect(result).toMatchObject({ schemaValid: true, risk: "medium", allowed: true });
    expect(result.expectedEffects).toContain("Set one lead next action");
  });

  it("fails closed for malformed proposals", () => {
    const result = simulateAction({
      actorRole: "owner",
      input: { type: "create_lead", workspaceId: "ws_1", payload: {} },
    });
    expect(result).toMatchObject({ schemaValid: false, allowed: false, code: "ACTION_INVALID_STATE" });
  });

  it("denies unsupported actions without mutation", () => {
    const result = simulateAction({
      actorRole: "owner",
      input: {
        type: "request_booking",
        workspaceId: "ws_1",
        leadId: "lead_1",
        idempotencyKey: "lead_1:request_booking",
        proposedBy: { type: "ai" },
        payload: {},
      },
    });

    expect(result).toMatchObject({ schemaValid: false, supported: false, allowed: false, code: "ACTION_NOT_SUPPORTED" });
  });
});
