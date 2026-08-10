/**
 * Production AI orchestrator.
 *
 *   Incoming message
 *     -> deterministic security pre-check
 *     -> build system prompt (this workspace's approved knowledge only)
 *     -> OpenAI server adapter (structured output)
 *     -> parse + validate against AssistantDecisionSchema
 *     -> post-generation policy validation
 *     -> return AssistantDecision
 *
 * The model never performs actions (no Firestore writes, no lead creation).
 * It returns a decision; api/chat.ts decides what to actually execute.
 *
 * `callModel` is injectable so this can be tested deterministically without
 * a live OpenAI key - see src/lib/ai/orchestrator.test.ts. In production,
 * api/chat.ts calls this with the default (real) adapter.
 */
import { AssistantDecisionSchema, type AssistantDecision } from "../../types/ai.js";
import type { KnowledgeSource } from "../../types/knowledge.js";
import { isHostileRequest, SECURITY_REFUSAL_RESPONSE } from "./securityPreCheck.js";
import { buildSystemPrompt, UNKNOWN_INFO_RESPONSE } from "./prompt.js";
import { validateAssistantDecision, POLICY_FALLBACK_RESPONSE } from "./policyValidate.js";
import { callAssistantModel } from "./openaiClient.js";

export type ModelCaller = typeof callAssistantModel;

export interface OrchestrateParams {
  businessName: string;
  /** Must already be filtered to this workspace + status === "approved". */
  approvedKnowledge: KnowledgeSource[];
  userMessage: string;
  callModel?: ModelCaller;
}

export interface OrchestrateResult {
  decision: AssistantDecision;
  providerRequestId?: string;
  usedFallback: boolean;
  fallbackReason?: "security_precheck" | "model_unavailable" | "invalid_schema" | "policy_violation" | "provider_error";
}

function fallbackDecision(response: string): AssistantDecision {
  return {
    intent: "unsupported",
    response,
    shouldCreateLead: false,
    shouldRequestHandoff: true,
    confidence: 0,
  };
}

export async function orchestrateAssistantResponse(
  params: OrchestrateParams
): Promise<OrchestrateResult> {
  // 1. Deterministic security pre-check - never reaches the model.
  if (isHostileRequest(params.userMessage)) {
    return {
      decision: {
        intent: "security_refusal",
        response: SECURITY_REFUSAL_RESPONSE,
        shouldCreateLead: false,
        shouldRequestHandoff: false,
        confidence: 1,
      },
      usedFallback: true,
      fallbackReason: "security_precheck",
    };
  }

  const systemPrompt = buildSystemPrompt({
    businessName: params.businessName,
    knowledge: params.approvedKnowledge,
  });

  const callModel = params.callModel ?? callAssistantModel;

  let raw: { text: string; providerRequestId?: string } | null;
  try {
    raw = await callModel({ systemPrompt, userMessage: params.userMessage });
  } catch (error) {
    console.warn("[ai.orchestrator] provider call failed", error);
    return {
      decision: fallbackDecision(POLICY_FALLBACK_RESPONSE),
      usedFallback: true,
      fallbackReason: "provider_error",
    };
  }

  if (!raw) {
    // Not configured (no OPENAI_API_KEY) - fail safely, never fake AI output.
    return {
      decision: fallbackDecision(UNKNOWN_INFO_RESPONSE),
      usedFallback: true,
      fallbackReason: "model_unavailable",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    return {
      decision: fallbackDecision(POLICY_FALLBACK_RESPONSE),
      usedFallback: true,
      fallbackReason: "invalid_schema",
    };
  }

  const result = AssistantDecisionSchema.safeParse(parsed);
  if (!result.success) {
    return {
      decision: fallbackDecision(POLICY_FALLBACK_RESPONSE),
      usedFallback: true,
      fallbackReason: "invalid_schema",
    };
  }

  const violations = validateAssistantDecision(result.data);
  if (violations.length > 0) {
    console.warn("[ai.orchestrator] policy violation, using fallback", violations);
    return {
      decision: fallbackDecision(POLICY_FALLBACK_RESPONSE),
      providerRequestId: raw.providerRequestId,
      usedFallback: true,
      fallbackReason: "policy_violation",
    };
  }

  return {
    decision: result.data,
    providerRequestId: raw.providerRequestId,
    usedFallback: false,
  };
}
