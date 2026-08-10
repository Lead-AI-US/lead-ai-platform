# Architecture

## Status

MVP implemented, `feat/real-saas-foundation` (2026-08-09). This describes
what's actually in the repository, not a plan — see `docs/MVP_VERIFICATION.md`
for the evidence.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, client-side
  routed with `react-router-dom`.
- **Auth:** Firebase Authentication (email/password).
- **Database:** Cloud Firestore, multi-tenant (see `docs/FIRESTORE_SCHEMA.md`).
- **Server:** TypeScript Vercel serverless functions under `api/`, using the
  Firebase Admin SDK for privileged reads/writes.
- **AI:** OpenAI server SDK (`openai` npm package), Responses API with
  strict structured output — see `docs/AI_ARCHITECTURE.md`.
- **Hosting:** Vercel (not yet deployed — see `docs/DEPLOYMENT.md`).
- **Tests:** Vitest for unit/orchestrator tests; `@firebase/rules-unit-testing`
  against the Firestore emulator for security rules.

The original scaffold's "FastAPI-ready API structure" was not used — this
build is TypeScript end-to-end, per the governing brief's explicit direction.

## Request flow

```
Dashboard (React SPA)
   -> Firebase ID token
   -> api/*.ts (Vercel function)
   -> requireFirebaseUser / requireWorkspaceMembership / requireWorkspaceRole
   -> Firebase Admin SDK (Firestore)

Website chat widget (on a customer's own site)
   -> POST /api/chat  { widgetKey, visitorSessionId, message }
   -> resolve workspace by publicWidgetKey
   -> validate Origin against workspace.allowedOrigins
   -> rate limit (Firestore-backed, durable across invocations)
   -> load ONLY that workspace's approved knowledge
   -> src/lib/ai/orchestrator.ts -> OpenAI structured output
   -> policy validation
   -> server decides: create lead? mark conversation needs_human?
   -> persist conversation/messages/lead/analytics
   -> reply to widget
```

The model never writes to Firestore, never sends anything, never confirms a
booking. It returns a structured `AssistantDecision`
(`src/types/ai.ts`); `api/chat.ts` is the only code that turns that into
Firestore writes.

## Directory layout

```
api/                          Vercel serverless functions (server-only)
  chat.ts                     public widget endpoint
  workspaces/
    index.ts                  POST - onboarding (create workspace + owner)
    [workspaceId]/
      index.ts                PATCH - workspace settings (admin)
      leads/                  GET/POST list+create, [leadId].ts PATCH status
      knowledge/              GET/POST list+create, [knowledgeId].ts PATCH status
      analytics/summary.ts    GET - aggregated analytics

src/
  lib/
    firebase/client.ts        browser Firebase SDK (public config)
    firebase/admin.ts         SERVER ONLY - Firebase Admin SDK
    auth/                     AuthProvider, ProtectedRoute, serverAuth.ts
    workspace/                WorkspaceProvider, widget key/snippet
    ai/                       orchestrator, OpenAI adapter, prompt, policy,
                               security pre-check
    analytics/                track.ts, timeRange.ts
    audit/log.ts
    http/                     originPolicy, rateLimit, apiHelpers
    validation/                Zod schemas for every write path
  types/                      domain types shared by client + server
  app/, pages/, components/   UI

firebase/
  firestore.rules             security rules (tenant isolation)
  firestore.indexes.json

docs/                         this directory
```

## Data model summary

See `docs/FIRESTORE_SCHEMA.md` for the full collection layout. In short:
`users/{uid}`, `workspaces/{id}`, `workspaceMembers/{wsId}_{uid}`, and
everything workspace-scoped lives under `workspaces/{id}/...` subcollections
(`leads`, `knowledgeSources`, `conversations/{id}/messages`,
`analyticsEvents`, `auditLogs`, `rateLimits`). Tenant isolation is enforced
both structurally (a query can only ever reach one workspace's subcollection)
and by Firestore Security Rules (defense in depth).

## What's deferred (by design, not oversight)

WhatsApp, voice AI, SMS, Google Calendar booking, Stripe billing, advanced
lead scoring, white-label/agency hierarchy, large CRM integrations. See
`docs/ROADMAP.md`.
