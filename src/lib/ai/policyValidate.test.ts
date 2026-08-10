import { describe, it, expect } from "vitest";
import { validateAssistantDecision } from "./policyValidate";
import type { AssistantDecision } from "@/types/ai";

function decision(response: string, overrides: Partial<AssistantDecision> = {}): AssistantDecision {
  return {
    intent: "faq",
    response,
    shouldCreateLead: false,
    shouldRequestHandoff: false,
    confidence: 0.8,
    ...overrides,
  };
}

describe("validateAssistantDecision — post-generation policy gate", () => {
  it("flags a response with a dollar amount", () => {
    const violations = validateAssistantDecision(decision("Our starter plan is $299 per month."));
    expect(violations.some((v) => v.code === "pricing_claim")).toBe(true);
  });

  it("flags a response with a percentage guarantee", () => {
    const violations = validateAssistantDecision(decision("We guarantee a 50% increase in leads."));
    expect(violations.some((v) => v.code === "pricing_claim")).toBe(true);
  });

  it("flags a false success claim about a human already responding", () => {
    const violations = validateAssistantDecision(decision("A human has received your message and will reply shortly."));
    expect(violations.some((v) => v.code === "false_success_claim")).toBe(true);
  });

  it("flags a false booking confirmation claim", () => {
    const violations = validateAssistantDecision(decision("Your appointment is confirmed for tomorrow at 3pm."));
    expect(violations.some((v) => v.code === "false_success_claim")).toBe(true);
  });

  it("does not flag a normal, honest response", () => {
    const violations = validateAssistantDecision(
      decision("We're open Monday through Friday, 9am to 5pm. I can connect you with the team for anything else.")
    );
    expect(violations).toHaveLength(0);
  });

  it("does not flag the honest unknown-information fallback", () => {
    const violations = validateAssistantDecision(
      decision("I don't have enough verified information to answer that accurately. I can connect you with the team.")
    );
    expect(violations).toHaveLength(0);
  });
});
