import { z } from "zod";

export const ASSISTANT_INTENTS = [
  "faq",
  "lead_capture",
  "human_handoff",
  "unsupported",
  "security_refusal",
] as const;
export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number];

/**
 * Canonical structured output contract for the AI orchestrator. The model
 * never performs actions directly (no Firestore writes, no lead creation) —
 * it returns this decision, and server-side services decide what to
 * actually execute after policy validation. See docs/AI_ARCHITECTURE.md.
 */
export const AssistantDecisionSchema = z.object({
  intent: z.enum(ASSISTANT_INTENTS),
  response: z.string().min(1).max(2000),
  shouldCreateLead: z.boolean(),
  shouldRequestHandoff: z.boolean(),
  confidence: z.number().min(0).max(1),
  collectedFields: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().max(320).optional(),
      phone: z.string().max(40).optional(),
    })
    .partial()
    .optional(),
  reason: z.string().max(500).optional(),
});

export type AssistantDecision = z.infer<typeof AssistantDecisionSchema>;

/**
 * JSON Schema mirror of AssistantDecisionSchema, for OpenAI structured
 * output (Responses API `text.format`). OpenAI's strict mode requires every
 * property to be listed in `required`; true optionality is expressed by
 * unioning with "null" instead of omitting the key.
 */
export const ASSISTANT_DECISION_JSON_SCHEMA = {
  name: "assistant_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "intent",
      "response",
      "shouldCreateLead",
      "shouldRequestHandoff",
      "confidence",
      "collectedFields",
      "reason",
    ],
    properties: {
      intent: { type: "string", enum: [...ASSISTANT_INTENTS] },
      response: { type: "string" },
      shouldCreateLead: { type: "boolean" },
      shouldRequestHandoff: { type: "boolean" },
      confidence: { type: "number" },
      collectedFields: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["name", "email", "phone"],
        properties: {
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
        },
      },
      reason: { type: ["string", "null"] },
    },
  },
} as const;
