# Authorization

## Principle

Role/membership is *always* derived server-side from `workspaceMembers`.
Never trusted from the browser: not a role field in a request body, not a
query parameter, not an "is owner" flag, not an email address.

## Server flow (`src/lib/auth/serverAuth.ts`)

```
Authorization: Bearer <Firebase ID token>
  -> Firebase Admin verifyIdToken()          requireFirebaseUser()
  -> workspaceMembers/{workspaceId}_{uid}     requireWorkspaceMembership()
  -> role >= minimum required                 requireWorkspaceRole()
```

Every function fails closed: on missing config, missing/invalid token,
missing membership, disabled membership, or insufficient role, it writes the
HTTP response itself (401/403/503) and returns `null`. Every API route
checks for `null` and returns immediately — there is no code path that
"continues anyway."

## Role ladder

`viewer < member < admin < owner` (`src/types/workspace.ts::roleAtLeast`).
Higher roles satisfy lower minimums.

## Route authorization matrix

| Endpoint | Caller | Authentication | Workspace scope | Minimum role |
|---|---|---|---|---|
| `POST /api/workspaces` | any signed-in user | Firebase ID token | none yet (creates it) | n/a (becomes owner) |
| `PATCH /api/workspaces/:id` | workspace user | Firebase ID token | path param, server-checked | admin |
| `GET /api/workspaces/:id/leads` | workspace user | Firebase ID token | path param, server-checked | viewer |
| `POST /api/workspaces/:id/leads` | workspace user | Firebase ID token | path param, server-checked | member |
| `PATCH /api/workspaces/:id/leads/:leadId` | workspace user | Firebase ID token | path param, server-checked | member |
| `GET /api/workspaces/:id/knowledge` | workspace user | Firebase ID token | path param, server-checked | viewer |
| `POST /api/workspaces/:id/knowledge` | workspace user | Firebase ID token | path param, server-checked | admin |
| `PATCH /api/workspaces/:id/knowledge/:id` | workspace user | Firebase ID token | path param, server-checked | admin |
| `GET /api/workspaces/:id/analytics/summary` | workspace user | Firebase ID token | path param, server-checked | viewer |
| `GET /api/workspaces/:id/members` | workspace user | Firebase ID token | path param, server-checked | viewer |
| `PATCH /api/workspaces/:id/members/:userId` | workspace user | Firebase ID token | path param, server-checked | admin — and see below |
| `GET`/`POST /api/workspaces/:id/invites` | workspace user | Firebase ID token | path param, server-checked | admin — owner-only to invite as `owner` |
| `DELETE /api/workspaces/:id/invites/:inviteId` | workspace user | Firebase ID token | path param, server-checked | admin — owner-only to revoke an `owner` invite |
| `POST /api/workspaces/:id/invites/:inviteId/accept` | the invited user | Firebase ID token | none required — this is how they become one | n/a — the invite's own email match is the check, see below |
| `POST /api/workspaces/:id/leave` | workspace user | Firebase ID token | path param, server-checked | viewer (any active member) — the last active owner is blocked, see below |
| `POST /api/workspaces/:id/actions` | workspace user | Firebase ID token | path param, server-checked | role-dependent on action risk — see `actionPolicy.ts`; medium/high risk additionally require a verified `approvedBy`, see below |
| `POST /api/chat` | website visitor | none (public) — scoped by `publicWidgetKey` (locator, not secret) + `Origin` allowlist + rate limit | resolved from `publicWidgetKey`, not client-asserted | channel policy, not a role |

### Team membership rules (beyond the plain role ladder)

- **Admin can manage `member`/`viewer` only.** Changing anything about an
  `owner` or `admin` membership (role, status) — or inviting/promoting
  *to* `owner` or `admin` — requires the caller to already be an `owner`.
  Enforced in `src/server/members/memberPolicy.ts::canManageMemberRole`
  (unit-tested), independent of the route's own `admin`-minimum gate.
- **A workspace can never end up with zero active owners.** Demoting or
  disabling the last active owner is rejected with `409 last_owner`
  (`memberPolicy.ts::wouldRemoveLastOwner`), even by that owner acting on
  themselves.
- **Accepting an invite is authorized by e-mail match, not membership** —
  `POST .../invites/:inviteId/accept` intentionally does *not* call
  `requireWorkspaceRole`/`requireWorkspaceMembership` (the caller isn't a
  member yet); it instead requires the signed-in Firebase user's own
  verified email to match the invite's `email` field exactly, and the
  invite to be `pending` and unexpired.
- **Invite tokens are the Firestore document id itself** — server-only
  (`workspaces/:id/invites/:inviteId`, `allow read, write: if false` in
  `firebase/firestore.rules`), unguessable, and never sent to anyone but
  the admin who created it, who is responsible for sharing the link (see
  below — no live email provider is configured in this environment).
  Verified against the installed SDK, not assumed: Firestore auto-IDs
  (`@google-cloud/firestore`'s `autoId()`, `build/src/util.js`) are built
  from Node's `crypto.randomBytes` — a real CSPRNG, not `Math.random()` —
  with rejection sampling against a 62-character alphabet at 20
  characters (~119 bits of entropy). Not sequential, not guessable.
- **Leaving a workspace and demoting/disabling a member share one
  transactional code path** (`src/server/members/memberService.ts::applyMemberUpdate`)
  so the last-owner guarantee can't drift between the two routes. A
  read-check-write done as three separate Firestore calls has a real
  race — two concurrent requests touching two *different* owners of a
  2-owner workspace could each see "the other owner is still active"
  and both commit, leaving zero owners — so the target-doc read, the
  active-owner-count query, and the write are one Firestore transaction;
  Firestore serializes any concurrent transaction touching the same
  documents. Proven against the real emulator, not asserted: see
  `memberService.integration.test.ts`'s `CONCURRENCY` test, which fires
  two demotions at once with `Promise.all` and asserts exactly one
  `ok` / one `last_owner` (never both, never neither).
- **`agentActions` approval cannot be self-granted.** `approvedBy` on an
  action proposal is a plain client-supplied field — treating
  `approvedBy === (the proposer's own uid)` as "approved" (the previous
  behavior) let any proposer approve their own medium/high-risk action
  by simply naming themselves. `proposeAction`'s `verifyApproval` now
  requires `approvedBy` to name a *different* user who is themselves an
  active admin/owner of the workspace, verified against
  `workspaceMembers` server-side. See
  `actionService.integration.test.ts` for the real-emulator coverage
  (self-approval, a valid other-admin approver, a same-workspace
  non-admin approver, a nonexistent uid, and a disabled admin — all
  against real Firestore writes).

There is no Vercel Cron / `CRON_SECRET`-authenticated route in this MVP (no
scheduler exists yet — see `docs/MVP_VERIFICATION.md`), so that authorization
class doesn't apply here.

## Client-side (Firestore Security Rules)

The client SDK gets direct **read** access to workspace-scoped collections,
gated by `firebase/firestore.rules`'s `isActiveMember(workspaceId)` check
(which itself reads `workspaceMembers` from Firestore — not from the
request). All client **writes** are denied by rules; every mutation goes
through the API above, which does role checks rules alone can't express
(e.g. "admin to approve knowledge" vs. "member to create a lead") plus audit
logging and analytics tracking. See `docs/SECURITY.md`.

## Automations: not yet a live feature (found auditing `automationRunner.ts`)

`runAutomationForEvent` is never called anywhere in this codebase outside
its own file — no webhook, no `api/chat.ts` hook, nothing invokes it.
There is also no API route that creates or updates an `Automation`
document (no `api/workspaces/:id/automations*`), and the automations
dashboard (`src/pages/app/Automations.tsx`) is read-only (`onSnapshot`
only) with a purely illustrative, non-functional "templates" tab. The
whole feature is scaffolding — types, the runner, a read-only view — not
a live path a real user or event can reach today.

Because of that, a real reliability bug in the runner has zero live
impact right now, but is worth recording before someone wires this up:
`proposalFromAutomationAction()` always sets `approvedBy: undefined`
(the `type === "schedule_followup" ? undefined : undefined` ternary
evaluates to `undefined` on every branch), so any automation configured
with a medium-risk action (`schedule_followup`, `update_lead_stage`) can
never pass `evaluateActionPolicy`'s approval gate and would always land
in `pending_approval`/`failed` — never `completed`. Deliberately not
fixed speculatively: the right design (does creating/enabling an
Automation itself require admin+ and implicitly pre-approve its own
configured actions? a distinct "system-approved" flag separate from a
human `approvedBy`?) depends on decisions — an automation-creation route
with its own authorization model — that don't exist yet.

## Known gaps (honest, not silently deferred)

- **No email is actually sent for an invite.** No email provider is
  configured in this environment (see `docs/LOCAL_DEVELOPMENT.md`); the
  admin who creates an invite must copy the generated link from the Team
  settings UI and share it themselves. This is surfaced honestly in that
  UI, not presented as an automated email.
- **Duplicate-invite and already-a-member checks in `POST /invites` are
  not themselves transactional** (unlike the member-update path above) —
  two concurrent invite creations for the same email could both pass the
  "no pending invite exists" read before either write lands, producing
  two pending invites for one email. Low severity (worst case: two valid
  links, the first accepted wins since acceptance itself *is*
  transactional per-invite) but noted rather than silently assumed safe.
