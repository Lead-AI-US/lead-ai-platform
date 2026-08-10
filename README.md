# Lead.AI Platform

A multi-tenant SaaS: business owners sign up, create a workspace, add
approved knowledge about their business, install a website chat widget, and
get AI-answered visitor conversations that become leads — with human handoff
when the AI shouldn't answer alone.

## Product Status

MVP implemented and Product Pro UX integration in progress — runnable,
typechecked, linted, and tested locally. **Not deployed, not connected to a live
Firebase/OpenAI project, no real pilot has used it.** See
[docs/MVP_VERIFICATION.md](docs/MVP_VERIFICATION.md) for the honest,
evidence-based status of every piece, and
[docs/REALITY_BASELINE.md](docs/REALITY_BASELINE.md) for what this repo
looked like before this pass (docs only, no code).

## The loop this MVP proves

```
Sign up → create workspace → add approved knowledge → install widget
  → real visitor conversation → AI answer or human handoff → lead capture
  → owner dashboard → real analytics
```

WhatsApp, voice, SMS, calendar booking, billing, and advanced lead scoring
are explicitly out of scope until this loop has been used by a real pilot —
see [docs/ROADMAP.md](docs/ROADMAP.md).

## Product Pro surfaces

The app shell now includes grouped workspace navigation, a command palette,
responsive workspace header, and additional professional SaaS surfaces:

- AI Agent
- Automations
- Integrations
- AI Assets
- Developer Center

These surfaces layer on top of the real Firebase/Auth/Firestore/OpenAI
foundation. GitHub, Hugging Face, and Kaggle are shown as `Not Configured`
until real authorization and server-side secret handling are implemented.

## Tech Stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Firebase Authentication + Cloud Firestore (multi-tenant)
- Vercel serverless functions (TypeScript) + Firebase Admin SDK
- OpenAI server SDK, strict structured output
- Vitest (unit + AI orchestrator tests) + `@firebase/rules-unit-testing` (security rules)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values, see docs/LOCAL_DEVELOPMENT.md
npm run dev                  # http://localhost:5173
```

## Checks (all real — run these, don't take the README's word for it)

```bash
npm run typecheck   # tsc -b, 0 errors
npm run lint         # eslint, 0 errors
npm test             # vitest unit suite
npm run build        # vite build
npm run cli -- doctor
```

Firestore Security Rules tests need the emulator (JDK 21+) — see
[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Environment Variables

Documented in [.env.example](.env.example) — placeholders only, never commit
real values. Firebase client config (`VITE_FIREBASE_*`) is intentionally
public; `FIREBASE_PRIVATE_KEY` and `OPENAI_API_KEY` are server-only and
never bundled into client code (`src/lib/firebase/admin.ts` throws if
accidentally imported into browser code).

## Docs

| Doc | What it covers |
|---|---|
| [MVP_VERIFICATION.md](docs/MVP_VERIFICATION.md) | Evidence-based status of every piece |
| [REALITY_BASELINE.md](docs/REALITY_BASELINE.md) | What existed before this MVP pass |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, request flow, directory layout |
| [FIRESTORE_SCHEMA.md](docs/FIRESTORE_SCHEMA.md) | Collections, indexes, timestamp convention |
| [AUTHORIZATION.md](docs/AUTHORIZATION.md) | Server auth flow, route matrix |
| [API.md](docs/API.md) | Every endpoint, request/response shape |
| [AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) | Orchestration pipeline, safety gates, what's verified vs. not |
| [WIDGET.md](docs/WIDGET.md) | Public widget key, origin allowlist, rate limiting |
| [SECURITY.md](docs/SECURITY.md) | Secrets, tenant isolation, known simplifications |
| [LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) | Env setup, emulator, verification commands |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Target, required env vars, what's been checked |
| [PRODUCT_PRO_INTEGRATION.md](docs/PRODUCT_PRO_INTEGRATION.md) | Product Pro v2 integration boundaries |
| [CLI.md](docs/CLI.md) | Local Lead.AI CLI |
| [INTEGRATIONS.md](docs/INTEGRATIONS.md) | Provider metadata and connection status |
| [AI_ASSETS.md](docs/AI_ASSETS.md) | AI asset metadata registry |

## Responsible AI

The AI never invents business facts (hours, pricing, availability,
guarantees) — if approved knowledge doesn't cover a question, it says so and
offers a human. It never performs actions directly (no Firestore writes, no
booking confirmations) — it returns a structured decision the server
validates and acts on. See
[docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) for the full pipeline and
what's tested vs. what still needs a live model to verify.

## Security

No secrets committed, server-only credentials never bundled to the client,
fail-closed authorization at every layer, tenant isolation enforced both
structurally and by Firestore Security Rules. See
[docs/SECURITY.md](docs/SECURITY.md) for specifics and honestly-listed gaps.

## Related Lead.AI Products

- [Lead.AI Website](https://github.com/Arungharami/leadai.us) — the marketing site (separate repo/deployment)
- [Lead.AI Business Audit](https://github.com/Lead-AI-US/lead-ai-business-audit)
- [Lead.AI WhatsApp Agent](https://github.com/Lead-AI-US/lead-ai-whatsapp-agent) — not integrated with this platform yet
- [Lead.AI Fraud Shield](https://github.com/Lead-AI-US/lead-ai-fraud-shield)

## Author

Founded by Arun Kumar Gharami.
Website: https://www.lead-ai.us
GitHub: https://github.com/Arungharami

## License

See [LICENSE](LICENSE). A final license should be selected before accepting external contributions or publishing reusable code.
