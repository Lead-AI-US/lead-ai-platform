# Lead.AI 2.0 baseline — re-verified 2026-09-24

Supersedes `docs/production/P0_BASELINE.md` for status purposes; that
document's bug-by-bug narrative (7 fixed Firestore-undefined bugs, the
full emulator/e2e harness design) is not repeated here. This pass
re-verified all three repos' local state was exactly as that document
and the marketing/audit repos' own histories claimed (nothing had
drifted), then closed two of its three explicitly deferred findings.

## Repo / branch / commit status (re-verified, not assumed)

| Repo | Branch | Ahead of origin/main | Pushed? | Open PR? |
|---|---|---|---|---|
| `Arungharami/leadai.us` (marketing) | `feat/pilot-funnel-release` | 7 | No | No (existing `#8` on a different branch, untouched) |
| `Lead-AI-US/lead-ai-business-audit` | `fix/admin-auth-and-firestore-rules` | 2 | No | No |
| `Lead-AI-US/lead-ai-platform` | `feat/p0-real-pilot-core-loop` | 4 (2 from this pass) | No | No |

None of the three branches has ever been pushed. All three working
trees are clean as of this doc.

## What this pass verified and closed

Both fixes below were closed this pass, real and verified against a
real (emulated) Firestore Admin SDK and the real Playwright e2e suite —
not inferred from a code read alone.

1. **`actionService.ts` / `actionExecutor.ts` / `automationRunner.ts`
   undefined-field crash** (`P0_BASELINE.md`'s "NOT VERIFIED — same
   undefined-field bug pattern likely present" line). Confirmed present
   by direct code read against the zod schemas (every optional field
   the prior pass's 7 fixes addressed elsewhere has an exact analog
   here), fixed with the identical conditional-spread convention, then
   proved by starting the Firestore emulator and calling
   `proposeAction()` / `runAutomationForEvent()` directly with every
   optional field omitted: reproduces the real Admin SDK's "Cannot use
   'undefined' as a Firestore value" before the fix, completes cleanly
   after. `git log -1 eb950bc`.
2. **Mobile leads/customers table clipping** (`P0_BASELINE.md`'s
   "Mobile responsiveness (dashboard) — PARTIAL, real gap found", and
   this iteration's own master prompt: "Fix the previously identified
   mobile lead-table clipping issue"). Below the `sm` breakpoint, Leads
   and Customers now render one card per row instead of a table; `sm`
   and up is unchanged. Verified by running the full local
   pilot-journey stack (Auth + Firestore emulators, local API server,
   Vite dev) and the real `e2e/pilotJourney.spec.ts` — 6/6 still pass —
   and inspecting the regenerated
   `artifacts/pilot-journey/owner-leads-inbox-mobile.png`, which now
   shows the lead fully readable at the same 390px viewport the prior
   screenshot showed clipped. `git log -1 f0ec39e`.

`npm run typecheck`, `npm run lint` (2 pre-existing warnings, 0 errors),
`npm test` (123/123), and `npm run build` all re-run clean after both
fixes.

## Still open, not attempted this pass

Everything else `P0_BASELINE.md` listed as blocked or deferred is
unchanged and still accurate: `actionService.ts`'s `targetExistsForProposal`
/ policy layer itself was not re-audited beyond the field-shape fix; no
rate limiting on authenticated dashboard routes; no team-invite/role
routes; live OpenAI model behavior and a live Firebase project are both
still genuinely unverified (no credentials in this environment); the
marketing → platform funnel still links nowhere real, because the
platform has never been deployed.

Not attempted this pass (out of scope for what's independently
verifiable without credentials or authorization): the Phase 1 hero
copy/headline change this iteration's prompt suggests, billing/payment
work, live deployment of any of the three repos, or pushing/opening PRs
for any branch — all local-only per "never push without authorization"
until explicitly approved.

## What a human needs to do before this goes further

Unchanged from `P0_BASELINE.md`:
1. Review and push/merge the three local branches (or authorize this
   session to push them).
2. A real Firebase project (Auth + Firestore) with
   `firebase/firestore.rules` actually deployed, and the resulting env
   vars set wherever each app deploys.
3. A real `OPENAI_API_KEY` to verify live model behavior.
4. Confirmed Vercel project ownership under the intended team
   (`aruns-projects-0839d12f` was not visible to this session's Vercel
   connector as of the last check; only `aruns-projects-ba93fc58` was).
5. For the business-audit repo specifically: create the real admin
   Firebase Auth user and deploy `firestore.rules` before ever setting
   `VITE_FIREBASE_*` in that app's production environment — deploying
   the env vars without the rules would reopen the exact PII exposure
   `fix/admin-auth-and-firestore-rules` closes.
