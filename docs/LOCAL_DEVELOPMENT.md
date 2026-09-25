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

Update (verified 2026-09-22): a prior pass of this doc reported this as
blocked because the sandbox had Java 8 and `firebase-tools` requires 21+.
That's still true of a stock environment, but it's a one-time local
install, not a hard blocker — `winget install Microsoft.OpenJDK.21` (or
your platform's equivalent) resolves it, and does not require admin/global
PATH changes: point the emulator command at the new JDK explicitly for
just that invocation, e.g. on Windows:
```bash
PATH="/c/Program Files/Microsoft/jdk-21.0.12.101-hotspot/bin:$PATH" npx firebase emulators:start --only auth,firestore --project demo-lead-ai-platform
```
Once running, `npm run test:rules` passes for real against it — **13/13**,
verified locally this way, not just inferred from CI. The `rules-tests`
GitHub Actions job (`.github/workflows/ci.yml`) also installs a real JDK 21
and runs them on every push/PR, as independent confirmation.

## Full local pilot-journey stack (real browser, real emulators, no live keys)

This is the setup behind `e2e/pilotJourney.spec.ts` — a real Playwright
test that signs up an owner, creates a workspace, approves knowledge,
sends a real message through the real embeddable widget, and confirms the
resulting lead is visible to the correct owner and invisible to an
unrelated one (tenant isolation). It needs four things running together:

1. **Firestore + Auth emulators** (needs JDK 21+, see above):
   ```bash
   PATH="/c/Program Files/Microsoft/jdk-21.0.12.101-hotspot/bin:$PATH" npx firebase emulators:start --only auth,firestore --project demo-lead-ai-platform
   ```
   Both, not just Firestore — Auth-dependent flows (signup/login) fail
   with a generic "couldn't create that account" error if only Firestore
   is running; there is no separate error surfaced for a missing Auth
   emulator, so this is easy to get half-right silently.

2. **`.env.local`** with local-only, non-secret values (never real
   credentials, never committed — already covered by `.env.*` in
   `.gitignore`):
   ```env
   VITE_FIREBASE_API_KEY=demo-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-lead-ai-platform.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-lead-ai-platform
   VITE_FIREBASE_APP_ID=demo-app-id
   VITE_USE_FIREBASE_EMULATOR=true

   FIREBASE_PROJECT_ID=demo-lead-ai-platform
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-test@demo-lead-ai-platform.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="<any syntactically valid RSA PEM, e.g. `openssl genrsa 2048`, escaped to one line with literal \n — the emulator does not validate it as a real credential, but firebase-admin's cert() parser does require it to parse as a key>"

   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

   LEAD_AI_E2E_FAKE_MODEL=true
   ```
   `VITE_USE_FIREBASE_EMULATOR=true` is read by `src/lib/firebase/client.ts`
   and only ever takes effect under `import.meta.env.DEV` (i.e. `vite dev`,
   never a production/preview build) — see that file for the safety gate.
   `LEAD_AI_E2E_FAKE_MODEL=true` is read by
   `src/lib/ai/testModelAdapter.ts` and swaps only the outbound OpenAI
   network call for a deterministic response; it is hard-gated off whenever
   `NODE_ENV` or `VERCEL_ENV` is `production`, not just by this flag — see
   that file's docstring for exactly what it does and doesn't fake.

3. **The local API server** — a thin adapter for `api/*.ts` (real
   Vercel-style dynamic routing, but no reimplemented handler logic),
   standing in for `vercel dev` (which needs an interactive OAuth
   device-login flow that doesn't work in a non-interactive shell):
   ```bash
   npx tsx watch scripts/local-api-server.mts   # http://127.0.0.1:3001
   ```
   It also serves `GET /_e2e/widget-host?key=<publicWidgetKey>` — the real
   `widgetSnippet()` output (from `src/lib/workspace/widgetSnippet.ts`,
   not reimplemented) on its own page, standing in for "the business's own
   website" so a Playwright test can act as a genuine visitor against the
   real widget code.

4. **Vite dev server**, which proxies `/api/*` to the local API server
   (dev-only `server.proxy` in `vite.config.ts` — has no effect on `vite
   build`):
   ```bash
   npm run dev   # http://localhost:5173
   ```

Then:
```bash
npx playwright test        # e2e/pilotJourney.spec.ts, 6 tests
```

What's real vs. not in this setup: everything except one outbound network
call. Auth, Firestore reads/writes (through real security rules), origin
validation, rate limiting, the orchestrator's security pre-check / prompt
building / schema validation / policy validation, and the actual widget
JS are all real production code paths. Only `callAssistantModel`'s HTTP
call to OpenAI is swapped for a fixed local response, because no
`OPENAI_API_KEY` exists in this environment — see
`src/lib/ai/testModelAdapter.ts`'s docstring.

This local harness found and fixed six real bugs that the existing 123
Vitest unit tests (which don't exercise a real Firestore write) never
caught — all were "optional field left as literal `undefined` in an
object passed to `.set()`", which the real (and emulated) Firestore
Admin SDK rejects outright: workspace creation without a website domain,
first-time customer upsert without a name/email/phone, lead creation from
chat without every contact field, **every business-event write across the
app** (the root-cause fix, in `src/server/events/eventService.ts` —
silently swallowed by its own error handling, so this had likely never
worked in practice and would explain empty-looking analytics), manual
lead creation from the dashboard, and audit log entries without a detail
payload. Also found: the real widget sends `conversationId: null` for a
visitor's first message, which `ChatMessageInputSchema` rejected outright
(`.optional()` doesn't accept `null`, only absence) — meaning every real
visitor's *first* message would have failed in production. Fixed in
`src/lib/validation/chat.ts`.

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

## Deploying Firestore rules/indexes (once a real project exists)

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
```
