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

## Known gaps (honest, not silently deferred)

- **No email is actually sent for an invite.** No email provider is
  configured in this environment (see `docs/LOCAL_DEVELOPMENT.md`); the
  admin who creates an invite must copy the generated link from the Team
  settings UI and share it themselves. This is surfaced honestly in that
  UI, not presented as an automated email.
- **No self-service "leave workspace."** A member can currently only be
  disabled by an admin/owner, not remove themselves.
