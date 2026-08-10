# AI Architecture

## Pipeline

```
Incoming visitor message
  -> deterministic security pre-check (src/lib/ai/securityPreCheck.ts)
       hostile? -> security_refusal, MODEL NEVER CALLED
  -> build system prompt from THIS workspace's approved knowledge only
       (src/lib/ai/prompt.ts — caller must pre-filter to
       workspaceId == active && status == "approved"; in practice this is
       structurally guaranteed because api/chat.ts only ever queries
       workspaces/{workspaceId}/knowledgeSources)
  -> OpenAI Responses API, strict structured JSON output
       (src/lib/ai/openaiClient.ts)
  -> parse + validate against AssistantDecisionSchema (Zod)
       invalid/unparseable? -> safe fallback, response discarded
  -> post-generation policy validation (src/lib/ai/policyValidate.ts)
       pricing claim or false-success claim in the text? -> safe fallback
  -> AssistantDecision returned to api/chat.ts
  -> api/chat.ts (not the model) decides: create a lead? mark the
     conversation needs_human? — then persists and replies
```

Orchestrated by `src/lib/ai/orchestrator.ts::orchestrateAssistantResponse`,
fully covered by `src/lib/ai/orchestrator.test.ts` (15 tests) using dependency
injection — the model call is swapped for a deterministic fake in tests,
since no live `OPENAI_API_KEY` exists in this environment. See "What's
verified vs. not" below.

## The model never acts directly

No Firestore writes, no lead creation, no booking confirmation, no message
sends. It returns `AssistantDecision` (`src/types/ai.ts`); `api/chat.ts` is
the only code that turns a decision into a database write.

## Structured output contract

```typescript
interface AssistantDecision {
  intent: "faq" | "lead_capture" | "human_handoff" | "unsupported" | "security_refusal";
  response: string;
  shouldCreateLead: boolean;
  shouldRequestHandoff: boolean;
  confidence: number;               // 0-1
  collectedFields?: { name?; email?; phone? };
  reason?: string;
}
```

Enforced by both a Zod schema (runtime validation of what came back) and a
JSON Schema mirror (`ASSISTANT_DECISION_JSON_SCHEMA`) passed to OpenAI's
`text.format` for strict structured output. Malformed or non-conforming
output is rejected and replaced with the safe fallback — never parsed
loosely or coerced.

## Tenant isolation

Enforced structurally, not just by a filter: `api/chat.ts` only ever queries
`workspaces/{workspace.id}/knowledgeSources` — the workspace ID comes from
resolving the request's `widgetKey`, never from client input. There is no
code path that can load another workspace's knowledge into a prompt. This is
the primary defense; the security pre-check's cross-tenant phrase detection
(`another customer's leads`, etc.) is a secondary layer for tenant-shaped
*requests*, not a substitute for the structural isolation.

## Unknown information

The prompt explicitly instructs: if approved knowledge doesn't support an
answer, say `"I don't have enough verified information to answer that
accurately. I can connect you with the team."` — never invent hours,
location, services, pricing, availability, guarantees, or credentials. This
is a prompt-level instruction (not independently enforced by
`policyValidate.ts`, which only catches pricing/guarantee/false-success
patterns) — genuinely following it is model behavior, which is why "unknown
question handling" below is marked NOT VERIFIED, not GREEN.

## Security pre-router

Runs before any model call. Patterns: system prompt requests, API/secret
key requests, "ignore instructions", "you are now unrestricted", another
customer's/workspace's data, database export requests, Firebase credentials.
On match: `security_refusal` with a fixed safe response, model never
invoked. Fully unit-tested (`securityPreCheck.test.ts`, 16 cases).

## Human handoff

The AI can set `shouldRequestHandoff = true`; `api/chat.ts` persists
`conversation.status = "needs_human"` to Firestore *before* returning the
reply to the visitor, so the dashboard already reflects it by the time the
widget renders. The system prompt instructs the model never to claim "a
human has received your message" — only the server's persistence is the
source of truth, and the response text is policy-checked for exactly that
false-success pattern.

## Booking

NOT IMPLEMENTED. There is no calendar/availability integration in this MVP
(explicitly deferred per the governing brief). `lead_capture` intent exists
so a visitor's interest can become a `Lead` for a human to follow up with —
the AI never invents availability or confirms an appointment, because there
is no booking feature for it to falsely confirm.

## Model failure handling

| Condition | Behavior |
|---|---|
| `OPENAI_API_KEY` not set | `getOpenAIClient()` returns `null` → orchestrator uses the fallback, never a fake reply |
| Provider call throws (timeout, network) | Caught, fallback used, `fallbackReason: "provider_error"` |
| Response isn't valid JSON | Fallback, `fallbackReason: "invalid_schema"` |
| JSON doesn't match `AssistantDecisionSchema` | Fallback, `fallbackReason: "invalid_schema"` |
| Response text fails policy validation (pricing/false-success claim) | Fallback, `fallbackReason: "policy_violation"` |

Fallback response: *"I'm unable to answer that reliably right now. I can
connect you with the team."* — `shouldRequestHandoff: true`. Never silently
switches to generic marketing copy.

## Observability

`api/chat.ts` tracks `assistant_response_generated` / `assistant_response_failed`
analytics events with `durationMs` and `reason` (allow-listed properties
only — see `docs/SECURITY.md`). `providerRequestId` (OpenAI's response ID)
is captured in the orchestrator's return value for server-side debugging but
is not currently persisted anywhere or exposed to the client — logging it
is a natural next step, not yet done.

## What's verified vs. not

- **GREEN, tested:** security pre-check, schema validation, policy
  validation (pricing/false-success detection), fallback behavior on every
  failure mode, tenant-scoped knowledge loading, prompt construction. 15
  orchestrator tests + 16 security pre-check tests + 6 policy tests, all
  using dependency-injected fake model responses.
- **NOT VERIFIED — BLOCKED ON CONFIGURATION:** whether a real OpenAI model,
  given this exact prompt, actually follows the "never invent," "represent
  this business," and "don't claim success" instructions well in practice.
  No `OPENAI_API_KEY` exists in this environment. This requires a real
  integration test against a live (or sandboxed) OpenAI account before
  claiming the AI itself — as opposed to the harness around it — is
  production-safe.
