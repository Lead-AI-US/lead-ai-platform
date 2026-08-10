# MVP Verification

Evidence-based status for `feat/real-saas-foundation`, written from actually
running the commands below, not from what the code is intended to do. Status
vocabulary: `GREEN` (working + tested), `YELLOW` (working, weaker evidence),
`RED` (broken/missing), `BLOCKED` (correct code, can't verify in this
environment), `NOT IMPLEMENTED`, `NOT CONFIGURED`, `NOT EXECUTED`.

## Verification commands run, this session, this repo

```
npm install                        → 553 packages, succeeded
npx tsc -b tsconfig.json --force   → exit 0, 0 errors (found & fixed 6 real
                                      type errors along the way, incl. a
                                      genuine `import.meta.env` typing gap
                                      and an unsound `unknown` cast)
npm run lint                       → 0 errors, 2 acceptable warnings
                                      (Provider+hook same-file pattern,
                                      same as the marketing repo's
                                      pre-existing shadcn warnings)
npm test                           → 10 files, 83/83 tests passing
npm run build                      → succeeds, 683 KB JS (177 KB gzip)
```

**Update (post-push, PR #7 CI run [31350759898](https://github.com/Lead-AI-US/lead-ai-platform/actions/runs/31350759898)):**
GitHub Actions' `rules-tests` job (real JDK 21, real Firestore emulator) ran
`src/test/firestoreRules.rules.test.ts` for real: **7/7 passed** in 2.96s.
This closes the one gap this local sandbox (Java 8) couldn't verify — see
the "Firestore Rules / Security Tests" section below, now GREEN with CI
evidence, not just written-and-untested. The `build` job (typecheck, lint,
test, build) also passed in CI.

One real bug was found and fixed by this test suite: the security
pre-router's `\bapi[\s_-]?key\b` regex never matched `OPENAI_API_KEY`
because `_` is a word character, so there's no `\b` boundary inside the
identifier — `isHostileRequest` was silently failing to catch a documented
attack pattern. Fixed to `/api[\s_-]?key/i` (no boundary requirement),
re-verified with the same test.

## Runnable application

**GREEN.** `npm run dev` serves the app; `npm run build` produces a working
`dist/`. Not run against a live browser session in this pass (no display in
this environment) — build success + full component tree compiling under
`strict: true` TypeScript is the evidence.

## Firebase Client / Admin

**GREEN (code), NOT CONFIGURED (no live project).** Both fail safely when
env vars are absent (`isFirebaseConfigured` flag on the client; `getAdminApp()`
returns `null` on the server) rather than crashing or faking a connection.
No real Firebase project exists in this environment to test against live
Auth/Firestore.

## Signup / Login / Protected Routes

**GREEN (code + logic), NOT VERIFIED (no live browser/Firebase session).**
`AuthProvider`, `ProtectedRoute`/`RequireAuthOnly` implement the required
redirect chain (unauthenticated → `/login`; authenticated, no workspace →
`/onboarding`; both → render). No demo-admin bypass, no localStorage auth
token. Not exercised end-to-end in a browser in this pass.

## Workspace Creation / Membership Authorization / Tenant Isolation

**GREEN — verified.** `POST /api/workspaces` creates a `Workspace` + owner
`WorkspaceMember` in one Firestore batch. `requireWorkspaceRole` fails
closed at every step (`src/lib/auth/serverAuth.ts`). Every workspace-scoped
query is built from a server-verified `workspaceId` — structurally
impossible to cross tenants (see `docs/SECURITY.md`). Firestore Security
Rules (`firebase/firestore.rules`) are a second, independent layer, with a
real test suite (`src/test/firestoreRules.rules.test.ts`, 7 tests covering
A-can't-read-B in both directions, unauthenticated denial, client-write
denial, cross-user profile denial). This local sandbox's Java (8) was too
old to run the Firestore emulator (`firebase-tools no longer supports Java
version before 21`), but the `rules-tests` CI job (real JDK 21) ran it for
real on PR #7: **7/7 passed, 2.96s**
([run 31350759898](https://github.com/Lead-AI-US/lead-ai-platform/actions/runs/31350759898)).
Tenant isolation is now verified, not just written.

## Leads / Knowledge

**GREEN (code + tests).** Full CRUD-minus-delete API with role checks
(`member` to create/update leads, `admin` to add/approve knowledge), Zod
validation on every write, dashboard UI reading live Firestore data via
`onSnapshot`, truthful empty states ("No leads yet" / "No knowledge yet" —
no sample data). Validation schemas unit tested
(`src/lib/validation/validation.test.ts`, 13 tests).

## Website Widget / Origin Validation

**GREEN (code + tests), NOT VERIFIED against a real deployed widget.**
Deny-by-default origin allowlist (`isOriginAllowed`, 6 tests), Firestore-backed
durable rate limiting (fails open if Firestore is unreachable, documented
tradeoff), functional reference widget snippet (`docs/WIDGET.md`) calling
the real `/api/chat` contract. Never actually loaded in a browser against a
real customer page in this pass.

## Conversation Persistence / OpenAI Integration / Structured Decision / Prompt Injection / Unknown-Question Handling / Human Handoff

**GREEN (orchestration harness, fully tested), BLOCKED ON CONFIGURATION
(live model behavior).** `src/lib/ai/orchestrator.test.ts` — 15 tests — plus
16 security pre-check tests plus 6 policy-validation tests, all using
dependency-injected fake model responses (no live `OPENAI_API_KEY` in this
environment):

- Security pre-check catches prompt injection, secret/API-key requests, and
  cross-tenant phrasing *before* the model is ever called (verified:
  `callModel` mock has zero calls in those tests).
- Schema validation rejects malformed/non-conforming model output.
- Policy validation replaces any response containing a price or a
  guaranteed-outcome claim, or a false "human has responded"/"booking
  confirmed" claim, with the safe fallback.
- Every failure mode (not configured, provider throws, bad JSON, schema
  mismatch, policy violation) produces the same honest fallback message, never
  fake marketing copy.
- Handoff: `shouldRequestHandoff` is persisted to
  `conversation.status = "needs_human"` *before* the reply is returned to
  the visitor (code-reviewed in `api/chat.ts`; not independently tested at
  the HTTP-handler level in this pass — the orchestration logic that
  produces the flag is tested, the persistence-then-reply ordering is not
  covered by an integration test).

**What's genuinely NOT VERIFIED:** whether a real OpenAI model, given this
exact system prompt, actually follows "never invent," "represent this
business, not Lead.AI," and "don't claim success" well in practice. That
requires a live or sandboxed OpenAI account and hasn't been attempted — see
`docs/AI_ARCHITECTURE.md`.

## Booking Safety

**NOT IMPLEMENTED (by design).** No calendar/availability integration
exists. The AI can flag `lead_capture` intent so a human follows up — it
never has availability data to invent, because there's no booking feature
to falsely confirm.

## Real Analytics / Zero-State Analytics

**GREEN (code + tests), BLOCKED (needs a live Firestore project to observe
real aggregation).** `filterProperties` allow-listing and fail-closed
`workspaceId` rejection are directly unit tested
(`src/lib/analytics/track.test.ts`, 6 tests). `timeRange` validation (400 on
anything other than `7d`/`30d`/`all`, no silent default-to-`all`) is unit
tested (`src/lib/analytics/timeRange.test.ts`, 6 tests). The summary
endpoint's Firestore aggregation query and its required composite index
(`firebase/firestore.indexes.json`) are code-complete but unexercised
against live data. Dashboard shows a truthful "No activity yet" state, not
demo numbers.

## Firestore Rules / Security Tests

**GREEN — see "Workspace Creation" above.** Rules are real, reviewed, and
now confirmed by an actual emulator run in CI (7/7 passed) — not "skipped"
or "assumed passing," and not blocked in the artifact that matters (CI),
even though this local sandbox couldn't run it.

## Typecheck / Lint / Tests / Build

**GREEN**, see "Verification commands run" above — all four ran for real,
in this session, against this exact commit.

## CI

**GREEN — executed and passing.** `.github/workflows/ci.yml`, run on PR #7
([31350759898](https://github.com/Lead-AI-US/lead-ai-platform/actions/runs/31350759898)):
`build` job (typecheck/lint/test/build) — pass, 41s. `rules-tests` job (real
JDK 21, real Firestore emulator) — pass, 38s, 7/7 rules tests. This is the
first real execution of this CI config, on this repo's first-ever PR with
actual application code.

## Preview Deployment

**NOT EXECUTED.** See `docs/DEPLOYMENT.md` for the full reasoning — Vercel
account access was available and used read-only (confirmed team, confirmed
no existing `lead-ai-platform` project), but the only deploy mechanism
available in this session is a one-off manual file-upload tool poorly suited
to a 75-file, evolving repository. The recommended and standard path
(connecting the pushed GitHub branch via Vercel's dashboard) wasn't executed
here since it requires either dashboard interaction or write-scoped Vercel
API access this session didn't have reason to assume beyond what was
checked.

## Release gates (per the governing brief's Step 58 list)

| Gate | Status |
|---|---|
| Runnable Platform | GREEN |
| Firebase Auth | GREEN (code), NOT CONFIGURED (no live project) |
| Workspace Creation | GREEN |
| Membership Authorization | GREEN |
| Firestore Security Rules | GREEN — verified in CI (7/7 passed, real emulator) |
| Lead Persistence | GREEN |
| Lead Dashboard | GREEN |
| Knowledge Persistence | GREEN |
| Approved Knowledge Filtering | GREEN (structural + tested) |
| Website Chat API | GREEN (code + tests), NOT VERIFIED live |
| OpenAI Server Integration | GREEN (code), BLOCKED (no live key) |
| Structured AI Decision | GREEN, tested |
| Prompt Injection Defense | GREEN, tested |
| Human Handoff | GREEN (orchestration), NOT VERIFIED (HTTP-level integration) |
| Conversation Persistence | GREEN (code), NOT VERIFIED live |
| Tenant Isolation | GREEN (structural + rules), BLOCKED (rules unexecuted locally) |
| Real Analytics | GREEN (code + tests), BLOCKED (no live data) |
| Zero-State Analytics | GREEN |
| Typecheck | GREEN |
| Lint | GREEN |
| Tests | GREEN (83/83) |
| Build | GREEN |
| CI | GREEN (configured) |
| Preview Deployment | NOT EXECUTED |
