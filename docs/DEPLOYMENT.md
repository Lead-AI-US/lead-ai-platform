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

## What was actually attempted in this build pass

No Vercel project exists yet for this repository, and this environment has
no Vercel authentication token scoped to create one. **No deployment was
attempted or claimed.** See `docs/MVP_VERIFICATION.md`'s "Production
Deployment" line for the honest status.
