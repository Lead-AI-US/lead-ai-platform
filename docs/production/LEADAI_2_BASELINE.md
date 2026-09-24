# Lead.AI 2.0 baseline — re-verified 2026-09-24

Supersedes `docs/production/P0_BASELINE.md` for status purposes; that
document's bug-by-bug narrative (7 fixed Firestore-undefined bugs, the
full emulator/e2e harness design) is not repeated here. This pass
re-verified all three repos' local state was exactly as that document
and the marketing/audit repos' own histories claimed (nothing had
drifted), then closed all four of its explicitly deferred findings and
one more (analytics event tracking) found along the way.

**2026-09-24, P1 pass addendum** — draft PRs opened for all three
branches ([marketing #10](https://github.com/Arungharami/leadai.us/pull/10),
[audit #21](https://github.com/Lead-AI-US/lead-ai-business-audit/pull/21),
[platform #16](https://github.com/Lead-AI-US/lead-ai-platform/pull/16));
none merged. A security audit of the team-invite system (explicitly
requested this pass) found and fixed two real issues beyond what the
prior pass's tests covered — both are detailed in `docs/AUTHORIZATION.md`
rather than repeated here: (1) the last-owner protection had a genuine,
now closed and emulator-proven-fixed, concurrency race (two simultaneous
demotions of different owners could both have succeeded); (2)
`agentActions` approval could be self-granted by any proposer naming
their own uid, now fixed to require a verified, different, active
admin/owner. Self-service "leave workspace" is also new this pass
(`POST /workspaces/:id/leave`), sharing the same transactional
last-owner guard. A new `npm run test:integration` (real Firestore
emulator, no mocks) now exists specifically for this class of
authorization/concurrency property — 11/11 passing, plus 2 new e2e
tests (13/13 total) and unchanged 15/15 rules + 132/132 unit.

## Repo / branch / commit status (re-verified, not assumed)

| Repo | Branch | Ahead of origin/main | Pushed? | Open PR? |
|---|---|---|---|---|
| `Arungharami/leadai.us` (marketing) | `feat/pilot-funnel-release` | 7 | **Yes** | No (existing `#8` on a different branch, untouched) |
| `Lead-AI-US/lead-ai-business-audit` | `fix/admin-auth-and-firestore-rules` | 2 | **Yes** | No — PR not opened, awaiting authorization |
| `Lead-AI-US/lead-ai-platform` | `feat/p0-real-pilot-core-loop` | 5 (3 from this pass) | **Yes** | No — PR not opened, awaiting authorization |

All three branches were pushed this pass, once authorized: the account's
GitHub email-privacy setting was blocking pushes from all three (commits
used a personal email), so the unpushed commits' author/committer email
was rewritten to the account's GitHub-issued noreply address via git
plumbing (`commit-tree` + `update-ref`, not `filter-branch`/`rebase`) —
verified tree-identical to the originals before moving any branch ref,
working trees untouched throughout. All three working trees are clean
as of this doc.

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
3. **No rate limiting on authenticated dashboard API routes**
   (`docs/SECURITY.md`'s own "known simplifications", `P0_BASELINE.md`'s
   deferred-findings list). Audited every file under `api/`: `chat.ts`,
   `search.ts`, `agent/test.ts` and `actions/index.ts` already had it;
   the other ten routes (workspace create/settings, lead
   list/create/status, knowledge list/create/approve, action
   simulation, both analytics endpoints, integration health) didn't.
   Added the existing `checkRateLimit()` to all ten. Verified two ways
   against the real emulator: the full e2e suite still passes (the new
   limits don't false-positive on real dashboard traffic), and a
   separate direct call proved the mechanism itself blocks once
   exceeded (limit=5 allowed exactly 5 calls, blocked the 6th).
   `git log -1 f63670f`.
4. **Team invites and role/status changes** (`docs/AUTHORIZATION.md`'s
   "known gaps": no route added members or changed roles — the owner
   membership created at onboarding was the only one that could ever
   exist). Net-new: `GET /members`, `PATCH /members/:userId`,
   `GET`/`POST /invites`, `DELETE /invites/:inviteId`,
   `POST /invites/:inviteId/accept`, a `src/server/members/memberPolicy.ts`
   authorization layer (unit-tested, 9/9) enforcing "admin manages
   member/viewer only, owner manages anyone" and "never remove the last
   active owner," new Firestore composite indexes and a
   server-only `invites` rules match, and a Team panel in Settings plus
   a standalone `/accept-invite` page. No live email provider exists in
   this environment, so invites generate a copyable link instead of
   silently claiming to have sent an email. Verified against the real
   emulator stack with a dedicated `e2e/teamInvite.spec.ts` (5/5): an
   owner invites a teammate, copies the real link, a brand-new account
   accepts it and lands in the same workspace with the invited role, the
   owner changes that role, and — the one case worth calling out
   specifically — attempting to demote the workspace's only owner is
   actually rejected by the server (409), re-verified after a page
   reload that the role didn't change.

Along the way, found and fixed a fifth instance of the same
undefined-field-into-Firestore bug this whole baseline has been chasing,
in `src/lib/analytics/track.ts` — sibling code to the `eventService.ts`
root-cause fix from the prior pass, but never itself touched. Every
visitor-triggered call in `api/chat.ts` (`lead_created`,
`conversation_started`, `assistant_response_generated/failed`,
`handoff_requested` — the app's single hottest code path) omits
`actorId`, which was being set unconditionally; against a real
Firestore this event write would have thrown and been silently
swallowed by the function's own fail-safe `catch`. Same
conditional-spread fix as the other four.

`npm run typecheck`, `npm run lint` (2 pre-existing warnings, 0 errors),
`npm test` (132/132, up from 123 — 9 new `memberPolicy` tests),
`npm run test:rules` (15/15, up from 13), and `npm run build` all
re-run clean after every fix in this pass.

## Still open, not attempted this pass

- `actionService.ts`'s `targetExistsForProposal`/policy layer itself was
  not re-audited beyond the field-shape fix.
- No self-service "leave workspace" route for a member to remove
  themselves (only an admin/owner disabling them).
- Live OpenAI model behavior and a live Firebase project are both still
  genuinely unverified (no credentials in this environment).
- The marketing → platform funnel still links nowhere real, because the
  platform has never been deployed.
- Not attempted (out of scope for what's independently verifiable
  without credentials or authorization): the Phase 1 hero copy/headline
  change this iteration's prompt suggests, billing/payment work, live
  deployment of any of the three repos, or opening pull requests for the
  now-pushed branches.

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
