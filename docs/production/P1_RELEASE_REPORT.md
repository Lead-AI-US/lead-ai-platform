# Lead.AI P1 release report — 2026-09-24

Coordinated report across all three repos for this pass, structured
against the mission brief's own 10-point deliverable list. Supersedes
nothing — `docs/production/LEADAI_2_BASELINE.md` remains the detailed
technical record of every fix in this repo; this document is the
release-level summary across all three.

## 1. Repository and branch status

| Repo | Branch | Commits ahead of `origin/main` | Pushed? |
|---|---|---|---|
| `Arungharami/leadai.us` (marketing) | `feat/pilot-funnel-release` | 8 | **Partial — see blocker below** |
| `Lead-AI-US/lead-ai-business-audit` | `fix/admin-auth-and-firestore-rules` | 2 | Yes |
| `Lead-AI-US/lead-ai-platform` | `feat/p0-real-pilot-core-loop` | 10 | Yes |

**Marketing repo push blocker**: the account's GitHub email-privacy
setting required rewriting this branch's commit author emails to the
account's noreply address (plumbing-only: `commit-tree` + `update-ref`,
verified tree-identical to the originals before moving the branch ref —
never touched with `filter-branch`/interactive `rebase`). That rewrite
changed every commit's hash, so landing it requires a force-push of a
branch that was already on GitHub with an open draft PR. Authorized and
attempted repeatedly; every attempt has failed or hung with `HTTP 408`
on the actual data transfer (confirmed via `GIT_CURL_VERBOSE=1` — auth
and the initial handshake succeed every time, the pack upload itself
times out), including after clearing orphaned retry processes,
increasing `http.postBuffer`, and forcing HTTP/1.1. This looks like a
transient network condition between this environment and GitHub for
this specific large multi-commit transfer, not an auth or permissions
problem (the other two repos, and this same repo's earlier smaller
pushes, all succeeded normally). **The hero-redesign and 320px-adjacent
commit (`0439315`) is verified, tested, and committed locally, but not
yet on GitHub as of this report** — retry `git push --force-with-lease`
from `leadai.us-1` when this is read; if it keeps failing, the fallback
is pushing over SSH instead of HTTPS, or from a different network.

## 2. Draft PRs (none merged, none auto-merged)

- Marketing: https://github.com/Arungharami/leadai.us/pull/10
- Business Audit: https://github.com/Lead-AI-US/lead-ai-business-audit/pull/21
- Platform: https://github.com/Lead-AI-US/lead-ai-platform/pull/16

None touch the pre-existing, unrelated `#8` (ecosystem links) on marketing.

## 3. Implemented changes this pass

**Security (Section 2 of the brief)**:
- Closed a genuine concurrency race in the last-active-owner protection
  (two simultaneous demotions of different owners could both have
  succeeded, leaving zero owners) — fixed with a Firestore transaction,
  proven with a real concurrent-write test against the emulator.
- Closed a self-approval bypass in `agentActions` (a proposer could
  approve their own medium/high-risk action by naming their own uid) —
  now requires a verified, different, active admin/owner.
- Self-service **Leave Workspace**, sharing the same transactional
  last-owner guard.
- Verified (not assumed) invite tokens are cryptographically random —
  checked the installed Firestore SDK's actual source.
- Audited `automationRunner.ts`: found it's entirely unwired (no
  trigger, no creation route, read-only UI) and a related approval-gate
  bug with zero live impact today — documented, not speculatively fixed.
- New `npm run test:integration` — real-emulator tests for exactly this
  class of property, a permanent addition to the test suite.

**UX (Section 3)**:
- Marketing hero redesigned to a centered layout (headline, description,
  CTAs, trust row) with readable max-widths, preserving the existing
  reference-style visual identity and the real interactive product demo.
- Fixed a genuine mobile-dashboard bug the 390px pass didn't catch: at
  320px, a lead's status badge rendered 30px past the viewport edge,
  invisible — not scrollable, silently clipped by a CSS quirk in a
  parent's `overflow-y-auto`. Root-caused and fixed (not just patched
  around), with a bounding-box assertion added to the e2e suite so a
  regression would be caught automatically.

**Documentation (Sections 5, 7)**:
- `docs/production/COMMERCIAL_LAUNCH_PLAN.md`: three packages, draft
  pricing marked pending approval, a per-customer cost model labeled as
  public-pricing-based estimates (no live usage data exists), and an
  explicit done-vs-blocked checklist for two paying pilots.
- `docs/PILOT_ONBOARDING_GUIDE.md`: added team-invite instructions and a
  first-month results-review step.

## 4. Test results

| Suite | Result | Notes |
|---|---|---|
| Platform `npm run typecheck` | ✅ clean | |
| Platform `npm run lint` | ✅ 0 errors, 2 pre-existing warnings | |
| Platform `npm test` (unit) | ✅ 132/132 | |
| Platform `npm run test:rules` (real Firestore emulator) | ✅ 15/15 | |
| Platform `npm run test:integration` (real Firestore emulator, new this pass) | ✅ 11/11 | includes the concurrency race test |
| Platform `npx playwright test` (real emulators + local API server + Vite) | ✅ 13/13 | `pilotJourney` (6) + `teamInvite` (6, incl. leave-workspace) |
| Platform `npm run build` | ✅ clean | |
| Marketing `npm run typecheck` / `lint` / `build` | ✅ clean | 7 pre-existing warnings |
| Marketing `npx playwright test` (homepage, accessibility, reference-style) | ✅ 19/19 | WCAG 2.1 AA, zero horizontal overflow at 7 viewports |
| Business Audit `npm run build` / `lint` | ✅ clean | (prior pass; unchanged this pass, re-audited only) |

No failing tests anywhere. No test was weakened or deleted to make a
suite pass.

## 5. Screenshots

- Hero, before/after: `leadai.us-1/docs/evidence/reference-style/hero-1440.png`,
  `hero-390.png` (committed; regenerated by the real Playwright evidence
  capture, not hand-edited).
- Mobile leads dashboard, 320px, before/after the fix: platform repo's
  `artifacts/pilot-journey/owner-leads-inbox-320.png`.
- Full pilot journey (desktop + mobile) and team-invite flow screenshots
  also committed under `artifacts/pilot-journey/`.

## 6. Verified staging URLs

**None.** No repo has ever been deployed to a live staging environment
in this pass or prior passes. See §9 for exactly what's blocking that.

## 7. Live integration status

- **OpenAI**: never called with a real key in this environment. Every
  code path downstream of the model call (grounding, policy validation,
  structured output, handoff) is verified via unit + integration tests
  and the fake-model e2e harness; the model call itself is not.
- **Firebase**: no real project exists. All Firestore/Auth behavior
  verified against local emulators, which enforce the same security
  rules and transaction semantics as production — a meaningfully strong
  verification, but not the same as a live project.
- **Vercel**: no deployment attempted. Team/project ownership unconfirmed
  (see §9).
- **Messaging (WhatsApp/Instagram), calendar/booking, payments**: not
  built. Not claimed as available anywhere in the product.

## 8. Outstanding security concerns

- `automationRunner.ts` is unwired and has an unfixed approval-gate bug
  — zero live impact today (nothing calls it), but flagged for whoever
  wires up automations next (`docs/AUTHORIZATION.md`).
- `POST /invites`'s own duplicate-invite check is not transactional
  (low severity — worst case is two valid links for one email, not a
  privilege issue, since per-invite acceptance is transactional).
- App Check for the business-audit intake form is wired
  (`auditAppCheck.ts`, `ReCaptchaV3Provider`) but inactive — needs a
  real `VITE_RECAPTCHA_SITE_KEY` from Google Cloud console access this
  environment doesn't have.
- No rate limiting exists on authenticated dashboard routes in the
  business-audit repo (only the intake form has abuse protection) — not
  audited this pass; worth a follow-up pass mirroring what the platform
  repo now has on every route.

## 9. Required owner-controlled setup

1. **Push the marketing branch** — see §1's blocker; retry
   `git push --force-with-lease` from a normal network, or push over SSH.
2. **A real Firebase project** (Authentication + Firestore) for the
   platform, with `firebase/firestore.rules` and
   `firebase/firestore.indexes.json` actually deployed.
3. **A real Firebase project** for the business-audit app, with its own
   `firestore.rules` deployed and a real admin account created —
   required *before* ever setting `VITE_FIREBASE_*` in that app's
   production environment (doing so first would reopen the exact PII
   exposure PR #21 closes).
4. **A real `OPENAI_API_KEY`** to verify live model behavior.
5. **Confirmed Vercel project ownership** under the intended team —
   `aruns-projects-0839d12f` was not visible to this session's connector;
   only `aruns-projects-ba93fc58` was, and no `lead-ai-platform` project
   exists there yet.
6. **A Google Cloud reCAPTCHA v3 site key** for App Check on the audit
   intake form.
7. **Review and merge (or request changes on) the three draft PRs.**
8. **Approve or replace the draft pricing** in `COMMERCIAL_LAUNCH_PLAN.md`
   before it's ever quoted to a prospect.
9. **A written pilot agreement/terms** — legal, not engineering, out of
   scope for this pass.

## 10. First-customer launch readiness

**Code-verified, not yet live-verified.** The full pilot journey
(signup → workspace → knowledge → widget → real visitor message →
captured lead → human follow-up), team management, and the security
properties audited this pass are all proven against real (emulated)
infrastructure with real assertions — genuinely more than a locally
passing test suite normally implies, but still short of a live customer
transaction. Nothing in this report claims otherwise.

The practical path to pilot #1, in order: (1) create the Firebase
project and deploy rules, (2) get an OpenAI key, (3) confirm Vercel
access and deploy platform + marketing to staging, (4) run the pilot
onboarding guide's acceptance checklist against that real staging
environment with a real (test) business, (5) only then onboard an
actual paying customer. Every step before that is owner-controlled
setup this session cannot complete without credentials.
