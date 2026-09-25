/**
 * Deterministic fake model — LOCAL PILOT-JOURNEY E2E TESTING ONLY.
 *
 * api/chat.ts never passes a callModel override in production; the real
 * orchestrator always uses callAssistantModel (openaiClient.ts), which
 * requires a live OPENAI_API_KEY. No such key exists in this environment,
 * so a real end-to-end browser test that reaches a genuine lead-capture
 * decision is impossible without one of: a live key, or a clearly-scoped
 * fake model swapped in for the *outbound network call only*. Everything
 * else in the request stays real: origin validation, rate limiting,
 * Firestore writes, the orchestrator's security pre-check / prompt
 * building / schema validation / policy validation.
 *
 * This is exactly the same dependency-injection seam
 * orchestrator.ts/orchestrator.test.ts already use for its own unit tests
 * (see ModelCaller) — this module just wires that seam up to api/chat.ts
 * behind an explicit, loud, non-production-only flag instead of leaving it
 * unreachable from the real HTTP route.
 *
 * Safety: resolveTestModelOverride() returns undefined (i.e. "use the real
 * model") unless ALL of:
 *   - LEAD_AI_E2E_FAKE_MODEL === "true"
 *   - NODE_ENV !== "production"
 *   - VERCEL_ENV !== "production"
 * The last two checks are not configurable by the same flag that enables
 * this — there is no way to turn this on in anything that identifies
 * itself as production.
 */
import type { ModelCaller } from "./orchestrator.js";
import type { AssistantDecision } from "../../types/ai.js";
import type { KnowledgeSource } from "../../types/knowledge.js";

export function isE2EFakeModelSafeToUse(): boolean {
  if (process.env.LEAD_AI_E2E_FAKE_MODEL !== "true") return false;
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

function extractField(message: string, key: "name" | "email" | "phone"): string | undefined {
  const pattern = new RegExp(`${key}:\\s*([^\\n]+?)(?:\\s+(?:name|email|phone):|$)`, "i");
  const match = message.match(pattern);
  return match?.[1]?.trim() || undefined;
}

/**
 * Reused across the fake-model call sites for this local test harness.
 * Behavior is intentionally simple and keyword-driven — it exists to prove
 * the surrounding pipeline (grounding, lead capture, handoff) works
 * end-to-end, not to simulate general model quality (that's a live-key
 * concern, out of scope here, see docs/AI_ARCHITECTURE.md "Not verified").
 */
export function buildTestDecision(userMessage: string, approvedKnowledge: KnowledgeSource[]): AssistantDecision {
  const lower = userMessage.toLowerCase();

  if (lower.includes("book an appointment") || lower.includes("book appointment")) {
    return {
      intent: "lead_capture",
      response: "I can have the team reach out to schedule a time that works for you.",
      shouldCreateLead: true,
      shouldRequestHandoff: false,
      confidence: 0.9,
      collectedFields: {
        name: extractField(userMessage, "name"),
        email: extractField(userMessage, "email"),
        phone: extractField(userMessage, "phone"),
      },
      reason: "E2E test: visitor requested a booking with contact details.",
    };
  }

  if (lower.includes("speak to a human") || lower.includes("talk to someone")) {
    return {
      intent: "human_handoff",
      response: "I'll connect you with our team.",
      shouldCreateLead: false,
      shouldRequestHandoff: true,
      confidence: 0.85,
      reason: "E2E test: visitor explicitly asked for a human.",
    };
  }

  const hoursSource = approvedKnowledge.find((source) => /hour/i.test(source.title));
  if (lower.includes("hour") && hoursSource) {
    return {
      intent: "faq",
      response: hoursSource.content,
      shouldCreateLead: false,
      shouldRequestHandoff: false,
      confidence: 0.92,
      reason: "E2E test: answered from approved knowledge, unchanged.",
    };
  }

  return {
    intent: "unsupported",
    response: "I don't have enough verified information to answer that accurately. I can connect you with the team.",
    shouldCreateLead: false,
    shouldRequestHandoff: true,
    confidence: 0.2,
    reason: "E2E test: no matching approved knowledge or scripted scenario.",
  };
}

/**
 * Matches the ModelCaller signature so it can be passed straight into
 * orchestrateAssistantResponse({ callModel: ... }) — it still runs through
 * the real security pre-check, schema validation, and policy validation
 * that live model output would.
 */
export function createTestModelCaller(approvedKnowledge: KnowledgeSource[]): ModelCaller {
  return async ({ userMessage }) => ({
    text: JSON.stringify(buildTestDecision(userMessage, approvedKnowledge)),
    providerRequestId: "e2e-fake-model",
  });
}

/** Returns a ModelCaller override for api/chat.ts, or undefined to use the real model. */
export function resolveTestModelOverride(approvedKnowledge: KnowledgeSource[]): ModelCaller | undefined {
  if (!isE2EFakeModelSafeToUse()) return undefined;
  return createTestModelCaller(approvedKnowledge);
}
