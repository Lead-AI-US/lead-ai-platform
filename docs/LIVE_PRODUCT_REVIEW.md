# Lead.AI Live Product Review

Date: 2026-08-10

## Vercel

- Team: `aruns-projects-ba93fc58` (`team_r62VZS6u8GtiCFAvauwwqo6B`)
- Project: `lead-ai-platform`
- Project ID: `prj_UoXJE45lmol57Oudymy6q2y0QJzV`
- Preview branch: `live-product-review`
- Preview commit: `ca50f9c2d892db124bb1c2a0a168b221b56990cb`
- Preview deployment: `dpl_6BNwb9xH9NYy6J26rmQNQAT1ecqU`
- Preview URL: `https://lead-ai-platform-h68xmxej4-aruns-projects-ba93fc58.vercel.app`
- Deployment state: `READY`
- Connected Git repository: not configured. Vercel CLI could not connect `Lead-AI-US/lead-ai-platform`; the Vercel GitHub app likely needs repository access.
- Production branch: not configured through Vercel Git connection.

## Environment

Preview variables:

- `VITE_FIREBASE_API_KEY`: MISSING
- `VITE_FIREBASE_AUTH_DOMAIN`: MISSING
- `VITE_FIREBASE_PROJECT_ID`: MISSING
- `VITE_FIREBASE_APP_ID`: MISSING
- `FIREBASE_PROJECT_ID`: MISSING
- `FIREBASE_CLIENT_EMAIL`: MISSING
- `FIREBASE_PRIVATE_KEY`: MISSING
- `OPENAI_API_KEY`: MISSING
- `OPENAI_MODEL_CHAT`: MISSING
- `LEAD_AI_CHAT_PROMPT_VERSION`: MISSING

## Coverage

- Runtime smoke: static routes `/`, `/login`, `/signup`, and `/app` returned HTTP 200, but the deployment is protected by Vercel Authentication. Unauthenticated API POST requests returned 401 before app code executed.
- Visual QA: MANUAL REQUIRED. Browser automation could not initialize in this session, and Vercel Deployment Protection prevents unauthenticated visual inspection.
- Mobile QA: MANUAL REQUIRED for the same reason.
- Accessibility interaction QA: MANUAL REQUIRED. Code-level labels/focus states remain covered by implementation review, but live keyboard/dialog testing was not completed.
- Command palette QA: MANUAL REQUIRED.
- Dark mode QA: MANUAL REQUIRED.

## Runtime Findings

- Build logs are clean for Vite and Vercel serverless bundling after PRs #10 and #11.
- Vercel install logs report dev/dependency audit findings during full install, but production audit remains clean locally with `npm audit --omit=dev`.
- No runtime 500 logs were returned by `vercel logs` for the deployment during smoke checks.
- Firebase Live: NOT CONFIGURED.
- OpenAI Live: NOT CONFIGURED.

## Provider Status

- GitHub local CLI: CONNECTED.
- GitHub product integration: NOT CONFIGURED.
- Hugging Face local CLI: CONNECTED.
- Hugging Face product integration: NOT CONFIGURED.
- Kaggle CLI: NOT CONFIGURED.
- Kaggle product integration: NOT CONFIGURED.

## Security Notes

- Provider credentials remain server-side only.
- Product provider connection status remains NOT CONFIGURED; local CLI authentication is not promoted to workspace integration status.
- Security scan found expected references only: Firebase bearer auth, server-only env reads, docs/examples, theme/widget localStorage, and redaction tests.

## Remaining Blockers

- Vercel Git connection for `Lead-AI-US/lead-ai-platform` is not configured.
- Required Preview environment variables are missing.
- Deployment Protection blocks unauthenticated visual review and API smoke testing.
- Real browser-based desktop/mobile/accessibility QA remains manual required.
