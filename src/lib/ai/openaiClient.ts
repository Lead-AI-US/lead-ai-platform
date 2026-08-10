/**
 * OpenAI server adapter — SERVER ONLY. Reads OPENAI_API_KEY / OPENAI_MODEL_CHAT
 * from process.env; never import this from client code (nothing in src/pages
 * or src/components should reference it - only api/chat.ts, via the
 * orchestrator).
 *
 * Fails safely: if OPENAI_API_KEY isn't set, getOpenAIClient() returns null.
 * Callers (the orchestrator) must treat that as "AI unavailable" and use the
 * documented safe fallback response - never fabricate a reply.
 */
import OpenAI from "openai";
import { ASSISTANT_DECISION_JSON_SCHEMA } from "@/types/ai";

let cachedClient: OpenAI | null | undefined;

export function getOpenAIClient(): OpenAI | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  cachedClient = apiKey ? new OpenAI({ apiKey }) : null;
  return cachedClient;
}

export function getChatModel(): string {
  return process.env.OPENAI_MODEL_CHAT || "gpt-4.1-mini";
}

export function getPromptVersion(): string {
  return process.env.LEAD_AI_CHAT_PROMPT_VERSION || "unversioned";
}

/**
 * Calls the OpenAI Responses API with strict structured output, returning
 * raw (unvalidated) JSON text. The orchestrator is responsible for parsing
 * and validating it against AssistantDecisionSchema — this function does
 * not know about the domain type, only about calling the provider.
 */
export async function callAssistantModel(params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<{ text: string; providerRequestId?: string } | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const response = await client.responses.create({
    model: getChatModel(),
    input: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userMessage },
    ],
    text: {
      format: {
        type: "json_schema",
        ...ASSISTANT_DECISION_JSON_SCHEMA,
      },
    },
  });

  return {
    text: response.output_text,
    providerRequestId: response.id,
  };
}
