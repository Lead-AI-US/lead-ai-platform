# P0 baseline — pilot core loop, verified 2026-09-22

Scope: the smallest real, secure, tested vertical slice of the pilot
journey — visitor discovers Lead.AI → completes a Business Audit →
requests a consultation → becomes a pilot customer → creates a workspace
→ configures an AI assistant → installs a website widget → receives a
real inquiry → captures and reviews the lead → performs a human
follow-up. This document covers all three repos touched this pass;
platform-specific detail lives here since that repo was the primary new
surface this pass verified.

## Repo / branch / commit status

| Repo | Branch | Commits | Pushed? | Notes |
|---|---|---|---|---|
| `Arungharami/leadai.us` (marketing) | `feat/pilot-funnel-release` | 7 ahead of `origin/main` | No | From a prior pass — `/demo` discoverability, sitemap, duplicate-content fix. Unchanged this pass. |
| `Lead-AI-US/lead-ai-business-audit` | `fix/admin-auth-and-firestore-rules` | 2, `main` untouched | No | From a prior pass — admin auth gate, Firestore rules, abuse protection. Unchanged this pass. |
| `Lead-AI-US/lead-ai-platform` | `feat/p0-real-pilot-core-loop` (new, branched from `origin/main` at `69ac0fc`) | 0 (uncommitted working tree as of writing — see below) | No | This pass's primary work. Local `main` was 1 commit behind `origin/main`; left untouched (never checked out or modified) rather than fast-forwarded, per "never modify main." |

## What existed before this pass (verified by reading the code, not the docs)

The platform repo's own documentation (`docs/REALITY_BASELINE.md`,
`docs/MVP_VERIFICATION.md`, `docs/SECURITY.md`, `docs/SECURITY_MODEL.md`,
`docs/AUTHORIZATION.md`) claimed a real, non-stubbed MVP, and that claim
held up under direct code review: real Firebase Auth with server-side ID
token verification on every protected route
(`src/lib/auth/serverAuth.ts`), real workspace creation and
Firestore-derived (never client-trusted) role checks, real Firestore
security rules enforcing tenant isolation with no admin bypass at the
rules layer, a real (if plain) embeddable widget with real origin
validation and rate limiting, and a real AI orchestrator with a
deterministic security pre-check, approved-knowledge-only prompting,
structured output, and post-generation policy validation that strips
invented prices/guarantees/false-success claims. 123 Vitest unit tests
existed and passed; a real Firestore rules test suite existed
(`src/test/firestoreRules.rules.test.ts`) but had never been run locally
(Java 8 in this sandbox vs. the emulator's Java 21+ requirement).

## What this pass did

1. Installed JDK 21 (`winget`, user-approved) and actually ran the rules
   suite against a live local emulator for the first time: **13/13
   passed** — genuine, not inferred from CI.
2. Built a local integration/e2e harness from scratch, since none existed:
   `scripts/local-api-server.mts` (a generic file-based router adapting
   `api/*.ts` handlers to a real Node server — `vercel dev` needs
   interactive OAuth login this environment can't complete), emulator
   wiring in `src/lib/firebase/client.ts` (previously had *zero* emulator
   support — a real gap), a dev-only Vite proxy, and a
   safety-gated deterministic fake model (`src/lib/ai/testModelAdapter.ts`)
   for the one piece that genuinely can't run without a live OpenAI key.
   See `docs/LOCAL_DEVELOPMENT.md` for the full setup and exactly what's
   real vs. faked.
3. Wrote `e2e/pilotJourney.spec.ts` — a real Playwright test driving a
   real browser through: signup → workspace creation → knowledge
   approval → a real visitor message through the *actual* widget script
   → lead visible in the owner's dashboard → status updated to
   "contacted" → a second, unrelated owner confirmed to see none of it.
   **6/6 passing**, locally, against real (emulated) infrastructure.
4. That harness surfaced **7 real, previously-undetected bugs** — all
   variations of "an optional field was left as literal `undefined` in an
   object passed to Firestore's `.set()`", which the real Admin SDK
   rejects outright. Unit tests never caught these because they mock the
   write layer; only a real (or emulated) Firestore does this validation.
   Fixed, each independently re-verified:
   - `api/workspaces/index.ts` — workspace creation crashed whenever
     `websiteDomain` was left blank (an explicitly optional field on the
     onboarding form).
   - `src/server/customers/customerService.ts` — the *first-visit*
     customer-upsert path crashed whenever name/email/phone weren't all
     present, which is the common case (a visitor's first message rarely
     has all three). The file's own `updatePayload` a few lines below
     already used the correct conditional-spread pattern; `createPayload`
     had just missed it.
   - `api/chat.ts` — lead creation from a real conversation crashed
     unless the model happened to collect name, email, *and* phone in
     one shot.
   - `src/server/events/eventService.ts` (`recordEvent`) — the root-cause
     fix. Called from `api/chat.ts` alone 6+ times per request, always
     omitting several optional linking IDs. Its own `try/catch` silently
     swallowed every failure, meaning **the business-event audit trail
     had likely never actually persisted in practice** — which would
     explain empty-looking analytics/timeline views without ever
     surfacing an error anywhere. Also fixed a nested case: `actor: {
     type, id }` where `id` (often a possibly-unresolved `customerId`)
     could itself be `undefined`.
   - `api/workspaces/[workspaceId]/leads/index.ts` — same pattern in the
     manual (dashboard) lead-creation path.
   - `src/lib/audit/log.ts` (`recordAuditEvent`) — same pattern for the
     `detail` field; most callers don't pass one.
   - `src/lib/validation/chat.ts` — the real, production
     `widgetSnippet()` script initializes `conversationId = null` and
     sends it as JSON `null` for a visitor's *first* message.
     `ChatMessageInputSchema` used `.optional()`, which accepts an absent
     key but rejects an explicit `null` — meaning **every real visitor's
     first message to the widget would have failed with 400** the moment
     this shipped against a real project. Changed to `.nullish()`;
     downstream code already treated any falsy `conversationId` as "start
     a new conversation," so no other change was needed.

## Verified feature inventory

| Area | Status | Evidence |
|---|---|---|
| Owner signup/login (real Firebase Auth) | VERIFIED | `e2e/pilotJourney.spec.ts` steps 1–2, real Auth emulator |
| Workspace creation + ownership | VERIFIED | Step 2; server-derived role, never client-trusted (`serverAuth.ts`) |
| Tenant isolation (Firestore rules) | VERIFIED | 13/13 rules tests against a live emulator + e2e step 6 (second owner sees nothing) |
| Business knowledge (add + approve) | VERIFIED | Step 3; approved-only knowledge is what the AI can quote |
| Website widget (real embed script) | VERIFIED | Step 4 — the actual `widgetSnippet()` output, not a stand-in, run in a real browser |
| Origin validation + rate limiting | VERIFIED (localhost path) | `originPolicy.ts`/`rateLimit.ts` are real code, exercised by the e2e run; production-domain allowlisting exists but has no live domain to test against yet |
| AI orchestration safety (pre-check, grounding, policy validation, handoff) | VERIFIED via unit tests + fake-model e2e | 20 orchestrator/policy/prompt unit tests pass; e2e proves the full pipeline wiring. **Live-model quality/behavior with a real OpenAI key remains unverified** — no key in this environment |
| Lead capture + owner inbox | VERIFIED | Step 5; real lead visible with correct name/email/message/source |
| Human follow-up (status update) | VERIFIED | Step 5; status change to "contacted" persisted and re-rendered |
| Business-event analytics trail | FIXED, NOW VERIFIED | Was silently broken (see above); `recordEvent` calls now succeed — not independently re-verified via the `analytics/summary` or `analytics/journey` endpoints' own output this pass (out of scope for the core-loop stop condition) |
| Agent actions / automations (`actionService.ts`, `automationRunner.ts`) | NOT VERIFIED — same undefined-field bug pattern likely present | Spot-checked, not fixed: `actionService.ts`'s `action` object has the identical unconditional-optional-field pattern (`customerId`, `leadId`, `conversationId`, etc.). Deferred: automations/agent-actions are explicitly outside the core pilot loop per this pass's brief ("do not expand into... complex CRM integrations... until this core loop has passed its release gates"). **Flagging for P1**, not silently leaving undiscovered. |
| Mobile responsiveness (dashboard) | PARTIAL — real gap found | `artifacts/pilot-journey/owner-leads-inbox-mobile.png`: the leads table clips columns at 390px instead of scrolling or stacking. Likely shared across other table-based pages (Customers, Automations). Not fixed — polish-level, not core-loop-blocking. |
| Marketing → platform funnel | NOT IMPLEMENTED | The platform has never been deployed (no live URL), so there is nothing real for marketing CTAs to link to yet. Documenting this rather than fabricating a link to a nonexistent environment. |
| Staging/production deployment | BLOCKED | No Firebase project, no OpenAI key, no verified Vercel project ownership for `lead-ai-platform` in this environment (see `docs/DEPLOYMENT.md`'s own prior finding: the intended `aruns-projects-0839d12f` team wasn't visible; only `aruns-projects-ba93fc58` was, and no `lead-ai-platform` project exists there yet). Not attempted this pass — no new deployment action taken. |

## Test results (this pass, run directly, exact numbers)

```
npm run typecheck   → clean
npm run lint         → 0 errors, 2 pre-existing cosmetic warnings (react-refresh, unrelated files)
npm test             → 21 files, 123/123 passed
npm run test:rules   → 1 file, 13/13 passed (real Firestore emulator, JDK 21)
npm run build        → succeeds
npx playwright test  → 6/6 passed (e2e/pilotJourney.spec.ts, real emulators + local API server)
```

## Known, deliberately deferred (not silently dropped)

- `actionService.ts`/`automationRunner.ts` likely share the undefined-field
  Firestore bug — not fixed, flagged for whoever picks up P1 automations
  work.
- No rate limiting on authenticated dashboard API routes (only `/api/chat`
  has it) — pre-existing, documented in `docs/SECURITY.md`'s own "known
  simplifications" before this pass.
- No team-invite/role-change routes — pre-existing, documented in
  `docs/AUTHORIZATION.md`'s "known gaps."
- Mobile table responsiveness (above).
- Live OpenAI model behavior, live Firebase project behavior: both
  genuinely unverified — this environment has neither credential, and
  none were fabricated or simulated as "working."

## What a human needs to do before this can go further

1. Review and merge (or request changes to) `feat/p0-real-pilot-core-loop`
   — currently local-only, per instruction not to push/merge without
   authorization.
2. Create a real Firebase project (or confirm an existing one) with
   Authentication (email/password) and Firestore enabled; deploy
   `firebase/firestore.rules` for real (`firebase deploy --only
   firestore:rules,firestore:indexes --project <id>`); set the resulting
   `VITE_FIREBASE_*` / `FIREBASE_*` env vars wherever this deploys.
3. Provide a real `OPENAI_API_KEY` to actually verify live model behavior
   — everything downstream of the model call is verified; the model call
   itself is not.
4. Confirm Vercel project ownership/access for a `lead-ai-platform`
   project under the intended team before any deploy is attempted.
