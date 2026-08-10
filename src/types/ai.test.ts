import { describe, it, expect } from "vitest";
import { AssistantDecisionSchema } from "./ai";

describe("AssistantDecisionSchema — structured output validation", () => {
  it("accepts a well-formed decision", () => {
    const result = AssistantDecisionSchema.safeParse({
      intent: "faq",
      response: "We're open 9-5.",
      shouldCreateLead: false,
      shouldRequestHandoff: false,
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown intent value", () => {
    const result = AssistantDecisionSchema.safeParse({
      intent: "sell_used_cars",
      response: "hi",
      shouldCreateLead: false,
      shouldRequestHandoff: false,
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside [0, 1]", () => {
    const result = AssistantDecisionSchema.safeParse({
      intent: "faq",
      response: "hi",
      shouldCreateLead: false,
      shouldRequestHandoff: false,
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing response field", () => {
    const result = AssistantDecisionSchema.safeParse({
      intent: "faq",
      shouldCreateLead: false,
      shouldRequestHandoff: false,
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects arbitrary prose instead of the structured shape", () => {
    const result = AssistantDecisionSchema.safeParse("Sure, our hours are 9-5!");
    expect(result.success).toBe(false);
  });
});
