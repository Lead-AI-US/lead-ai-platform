import type { AssistantDecision } from "@/types/ai";

export interface PolicyViolation {
  code: "pricing_claim" | "false_success_claim" | "cross_tenant_reference";
  detail: string;
}

const CURRENCY_PATTERN = /\$\s?\d|(\busd\b)|(\bdollars?\b)|€\s?\d|£\s?\d/i;
const PERCENT_GUARANTEE_PATTERN = /\b\d{1,4}\s?%\s*(guarantee|increase|off|discount)/i;
const FALSE_SUCCESS_PATTERN =
  /\b(a human has (received|responded)|your appointment is confirmed|booking confirmed|we('| ha)ve saved your (lead|info))\b/i;

/**
 * Post-generation policy validation - runs AFTER the model responds, BEFORE
 * the response reaches the visitor. Independent of what the model claims
 * about itself; checks the actual response text.
 */
export function validateAssistantDecision(decision: AssistantDecision): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const text = decision.response;

  if (CURRENCY_PATTERN.test(text) || PERCENT_GUARANTEE_PATTERN.test(text)) {
    violations.push({ code: "pricing_claim", detail: "Response contains a price or guaranteed-outcome claim." });
  }

  if (FALSE_SUCCESS_PATTERN.test(text)) {
    violations.push({
      code: "false_success_claim",
      detail: "Response claims an action succeeded that only the server can confirm.",
    });
  }

  return violations;
}

export const POLICY_FALLBACK_RESPONSE =
  "I'm unable to answer that reliably right now. I can connect you with the team.";
