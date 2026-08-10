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
3. Push `feat/real-saas-foundation` → Vercel builds a preview deployment
   automatically (once linked). Verify the preview URL loads `/login`.
4. Run through `docs/MVP_VERIFICATION.md`'s manual checklist against the
   preview before promoting anything to production.

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
