import { describe, expect, it } from "vitest";
import { ActionProposalSchema, isSupportedActionType, parseActionProposal } from "./actionSchema";

describe("ActionProposalSchema", () => {
  it("accepts a supported create lead proposal", () => {
    expect(
      ActionProposalSchema.parse({
        type: "create_lead",
        workspaceId: "ws_1",
        idempotencyKey: "event_1:create_lead",
        proposedBy: { type: "user", id: "user_1" },
        payload: { source: "manual", name: "Sarah Mitchell" },
      }).type
    ).toBe("create_lead");
  });

  it("rejects unsupported arbitrary action names", () => {
    expect(isSupportedActionType("delete_customer")).toBe(false);
    expect(() =>
      parseActionProposal({
        type: "delete_customer",
        workspaceId: "ws_1",
        idempotencyKey: "event_1:delete_customer",
        proposedBy: { type: "ai" },
        payload: {},
      })
    ).toThrow(/Unsupported action type/);
  });
});
