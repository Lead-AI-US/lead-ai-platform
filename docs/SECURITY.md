# Security

## Status

MVP implemented, `feat/real-saas-foundation` (2026-08-09). This replaces the
pre-implementation checklist that was here before — see
`docs/MVP_VERIFICATION.md` for full evidence of what's tested vs. not.

## Secrets

- `FIREBASE_PRIVATE_KEY`, `OPENAI_API_KEY`, `FIREBASE_CLIENT_EMAIL` are
  server-only — never `VITE_`-prefixed, never imported by anything under
  `src/pages` or `src/components`. `src/lib/firebase/admin.ts` throws if
  accidentally imported into browser code (checked via `globalThis`, not the
  bare `window` identifier, so it type-checks under both the DOM and
  DOM-less TS projects — see the file's comments).
- `VITE_FIREBASE_*` client config is intentionally public — Firebase's own
  security model relies on Firestore Security Rules and Auth, not on hiding
  that config. See `.env.example`.
- No secret value has been printed, logged, or committed at any point in
  this build — verified by grepping for `localStorage` + auth/token
  patterns, hardcoded secrets, and `VITE_*_API_KEY`/`VITE_*_SECRET` client
  exposure across `src/` and `api/`: no hits beyond expected placeholders.

## Authentication & authorization

See `docs/AUTHORIZATION.md` for the full server flow and route matrix.
Summary: Firebase ID token → Admin SDK `verifyIdToken` → `workspaceMembers`
lookup → role check, fail-closed at every step. No localStorage auth
bypass, no demo-admin bypass, no email-based admin check anywhere in the
codebase.

## Tenant isolation

Two independent layers:

1. **Structural** — every workspace-scoped query is built from
   `workspaces/{workspaceId}/...`, where `workspaceId` comes from a
   server-verified source (the path param checked against
   `workspaceMembers`, or the `publicWidgetKey` resolution in `api/chat.ts`)
   — never from unchecked client input. There is no code path that can
   query across workspaces.
2. **Firestore Security Rules** (`firebase/firestore.rules`) — defense in
   depth in case a client ever queries Firestore directly with a malformed
   or forged path. Rules tests (`src/test/firestoreRules.rules.test.ts`)
   prove Workspace A cannot read Workspace B's workspace doc, leads, or
   another user's `users/{uid}` profile. This local sandbox's Java 8 is too
   old for the Firestore emulator (needs 21+), but the `rules-tests` CI job
   (real JDK 21) ran them for real on PR #7: **7/7 passed** — see
   `docs/LOCAL_DEVELOPMENT.md` for the local setup and
   `docs/MVP_VERIFICATION.md` for the CI run link.

## CORS

`api/chat.ts` — deny by default. An unrecognized `Origin` gets no
`Access-Control-Allow-Origin` header (`src/lib/http/originPolicy.ts`), never
falls back to a trusted default. See `docs/WIDGET.md`.

## Input validation

Every write path (`api/workspaces/*`) validates its body with a Zod schema
before touching Firestore (`src/lib/validation/`) — 400 with a structured
error, never a raw exception, on invalid input.

## Analytics privacy

`src/lib/analytics/track.ts` — property allow-listing (only
`source/intent/status/channel/durationMs/reason/count` are ever stored; raw
messages, emails, and phone numbers are silently dropped even if passed in)
and fail-closed workspace attribution (empty/missing `workspaceId` → event
rejected, never attributed to a fallback bucket). Both behaviors are
directly unit tested (`src/lib/analytics/track.test.ts`).

## AI-specific security

See `docs/AI_ARCHITECTURE.md` — deterministic security pre-router (before
any model call), structured-output validation, post-generation policy
checks, and safe fallback on every failure mode. All unit tested with
dependency-injected fake model responses (no live OpenAI key required for
this test coverage).

## Known simplifications (honest, not hidden)

- Any active workspace member can read **draft** knowledge in the dashboard
  (not just approved). Only `status == "approved"` is ever sent to the AI
  model — the simplification is about dashboard visibility, not what the AI
  can say.
- No rate limiting on the authenticated dashboard API routes (`leads`,
  `knowledge`, etc.) — only the public `/api/chat` endpoint is rate limited.
  Reasonable for an MVP (these routes require a real Firebase session), but
  a gap worth closing before wide pilot traffic.
- Dependency vulnerabilities: `npm audit` reports vulnerabilities in the
  installed tree (mostly from `firebase-tools`, a devDependency used only
  for local emulator/rules testing, not shipped to production). Not
  triaged in this pass — flagged for follow-up before a real pilot.
