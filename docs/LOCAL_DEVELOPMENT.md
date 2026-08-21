# Local Development

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values - see below
npm run dev                  # http://localhost:5173
```

## Verification commands (all real, all runnable from a clean checkout)

```bash
npm run typecheck   # tsc -b across app/node/api projects
npm run lint         # eslint
npm test             # vitest — unit + AI orchestrator tests
npm run build        # vite build
```

## Firestore Security Rules tests (needs the emulator)

```bash
# Requires JDK 21+. Check with: java -version
npx firebase emulators:start --only firestore --project demo-lead-ai-platform
# in a second terminal:
npm run test:rules
```

This repository's development sandbox has Java 8, which `firebase-tools`
no longer supports for the emulator (`firebase-tools no longer supports
Java version before 21`) — confirmed by attempting to start it. The rules
and the test file are both real and complete
(`firebase/firestore.rules`, `src/test/firestoreRules.rules.test.ts`); only
running them locally is blocked here. The `rules-tests` GitHub Actions job
(`.github/workflows/ci.yml`) installs a real JDK 21 and runs them for real
on every push/PR — check that job's result rather than trusting this file's
description alone.

## Environment variables

See `.env.example` for the full list. To actually run the app against real
services you need:

- A **Firebase project** with Authentication (email/password provider) and
  Firestore enabled. Client config → `VITE_FIREBASE_*`. A service account
  key (Project Settings → Service Accounts → Generate new private key) →
  `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
- An **OpenAI API key** → `OPENAI_API_KEY`. Without it, `/api/chat` still
  works end-to-end but every response is the safe fallback (see
  `docs/AI_ARCHITECTURE.md`) — useful for testing the surrounding flow
  without spending on API calls.

Neither exists in this build's environment — no live Firebase project, no
live OpenAI key. Everything above `/api/chat`'s model call has been tested
without them (dependency-injected fakes); the live integration itself is
BLOCKED ON CONFIGURATION, not fabricated.

## Authenticated local QA with Firebase emulators

Authenticated local QA can run against the Firebase Auth and Firestore
emulators without service-account secrets. Use explicit demo values only:

```bash
npx firebase emulators:start --only auth,firestore --project demo-lead-ai-platform

FIREBASE_PROJECT_ID=demo-lead-ai-platform \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
VITE_FIREBASE_API_KEY=demo-api-key \
VITE_FIREBASE_AUTH_DOMAIN=demo-lead-ai-platform.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=demo-lead-ai-platform \
VITE_FIREBASE_APP_ID=demo-app-id \
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
vercel dev --listen 127.0.0.1:5173
```

When `vercel dev` serves the Vite dev modules correctly, this path exercises
Firebase Auth, Firestore Security Rules, server-side ID-token verification,
workspace membership resolution, and the real `/api/workspaces` onboarding
boundary. It does not create an authentication bypass and must not be used to
claim live Firebase/OpenAI validation.

For visual QA only, direct Vite can be used with the same `VITE_*` emulator
variables. Seed workspace membership through the emulator/Admin SDK, then sign
in normally through Firebase Auth. This still exercises `ProtectedRoute`,
`WorkspaceProvider`, Firebase Auth state, and Firestore rules, but it does not
exercise Vercel serverless API routes.

## Deploying Firestore rules/indexes (once a real project exists)

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
```
