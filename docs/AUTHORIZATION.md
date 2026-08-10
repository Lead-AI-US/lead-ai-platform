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
| `POST /api/chat` | website visitor | none (public) — scoped by `publicWidgetKey` (locator, not secret) + `Origin` allowlist + rate limit | resolved from `publicWidgetKey`, not client-asserted | channel policy, not a role |

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

- **No route adds additional members to a workspace yet.** Only the owner
  membership created at onboarding exists. Inviting teammates is NOT
  IMPLEMENTED.
- **No route changes a member's role or disables a membership.** NOT
  IMPLEMENTED.
