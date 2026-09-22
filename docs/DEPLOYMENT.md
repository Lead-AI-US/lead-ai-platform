# Deployment

## Status

MVP implemented, not yet deployed. This describes the real, intended
deployment path — see `docs/MVP_VERIFICATION.md` for what's actually been
attempted and its result.

## Target

Vercel, same team as the marketing site (`aruns-projects-0839d12f`), as a
**separate project** from the marketing site — this repo should not share a
Vercel project with `Arungharami/leadai.us`. Preferred future URL:
`app.lead-ai.us`. DNS is not touched automatically by any process in this
repo.

## Required environment variables (Vercel Project Settings → Environment Variables)

See `.env.example`. At minimum for a working preview: all `VITE_FIREBASE_*`,
`FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`. Without
`OPENAI_API_KEY`, chat still works but always returns the safe fallback
response (see `docs/AI_ARCHITECTURE.md`) — acceptable for an initial
preview, not for a real pilot.

## Firestore setup (before first real deploy)

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
```

Without this, the app will build and deploy but every Firestore read will
be denied (rules default-deny) until rules are pushed.

## Steps

1. `vercel link` (or import the GitHub repo in the Vercel dashboard) —
   creates a new project, does not touch the existing marketing project.
2. Set environment variables for `Production` and `Preview`.
3. Push the branch under review (as of 2026-09-22:
   `feat/p0-real-pilot-core-loop`, not yet pushed — see
   `docs/production/P0_BASELINE.md`) → Vercel builds a preview deployment
   automatically (once linked). Verify the preview URL loads `/login`.
4. Run through `docs/MVP_VERIFICATION.md`'s manual checklist against the
   preview before promoting anything to production.

## Firebase setup + security-rule deployment checklist

For whoever has real Firebase Console access — none of this was possible
from this environment:

- [ ] Create (or designate) a Firebase project for this app, separate
      from the business-audit repo's project.
- [ ] Console → Authentication → enable the Email/Password provider.
- [ ] Console → Firestore Database → create database (production mode).
- [ ] From this repo: `npx firebase deploy --only
      firestore:rules,firestore:indexes --project <your-project-id>` —
      deploys `firebase/firestore.rules` (real tenant isolation, verified
      13/13 against the emulator this pass — see
      `docs/production/P0_BASELINE.md`) and
      `firebase/firestore.indexes.json`.
- [ ] Console → Project Settings → General → copy the Web app config into
      `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` /
      `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID`.
- [ ] Console → Project Settings → Service Accounts → Generate new private
      key → set `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` /
      `FIREBASE_PRIVATE_KEY` (keep the key's newlines as literal `\n` in a
      single-line env var UI).
- [ ] Set all of the above in Vercel Project Settings → Environment
      Variables, for both `Preview` and `Production`.
- [ ] Provide a real `OPENAI_API_KEY` — without one, chat works but every
      reply is the safe fallback (intended behavior, not a bug, but not
      representative of a real pilot demo either).
- [ ] After deploying, confirm in the Firebase Console that the *live*
      rules match `firebase/firestore.rules` in this repo — console edits
      can silently drift from source control over time.
- [ ] Re-run `docs/MVP_VERIFICATION.md`'s manual checklist against the
      real preview URL before promoting to production.

## What was actually checked in this build pass

Vercel API access for the account was available and used read-only: the
team is `Arun's projects` (`team_r62VZS6u8GtiCFAvauwwqo6B`, slug
`aruns-projects-ba93fc58` — note this **does not match** the
`aruns-projects-0839d12f` slug named in the governing brief; it's the only
team this session could actually see, flagged here rather than silently
substituted). No project named `lead-ai-platform` exists yet among the
team's 25 projects (`lead-ai-saas` exists but has no linked GitHub repo per
a prior audit — not reused, to avoid inheriting an unclear history).

The only deploy mechanism available in this session is a one-off "paste
files, get a preview" tool meant for freshly generated single-shot apps, not
an ongoing git-connected repository — using it here would mean manually
re-transcribing ~75 source files into one call, with real risk of a
transcription mismatch silently producing misleading deploy evidence. That
tradeoff was surfaced and the decision was to **skip it**: push the branch
to GitHub (real, cheap, verifiable) and deploy via the Vercel dashboard's
**Import Git Repository** flow instead — the same mechanism the marketing
site's Vercel project already uses, and the correct one for a repo that will
keep evolving. **No deployment was attempted.** See
`docs/MVP_VERIFICATION.md`'s "Production Deployment" line.
