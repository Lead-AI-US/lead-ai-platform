# Website Chat Widget

## Public widget key

`Workspace.publicWidgetKey` (`wk_<uuid-no-dashes>`) is embedded in the
widget snippet a customer pastes on their site. It is a **locator, not a
secret** — it identifies which workspace a chat request belongs to, the same
way a Stripe publishable key or a Google Analytics measurement ID works.
Anyone who has it can attempt to open a conversation with that business's
assistant; nobody can use it to read the dashboard, leads, or knowledge base
— those all require a real Firebase-authenticated session (see
`docs/AUTHORIZATION.md`). Generated once at workspace creation
(`src/lib/workspace/widgetKey.ts`), never rotated by any route yet (NOT
IMPLEMENTED).

## Origin allowlist

Real protection is `Workspace.allowedOrigins` — configured in
`/app/settings`, enforced in `api/chat.ts` via
`src/lib/http/originPolicy.ts::isOriginAllowed`. Deny by default: an empty
allowlist means the widget responds nowhere. `localhost`/`127.0.0.1` are
always allowed for local development. No wildcard CORS fallback — an
unrecognized origin gets no `Access-Control-Allow-Origin` header and a `403`.

## Rate limiting

`src/lib/http/rateLimit.ts` — a durable, Firestore-backed fixed-window
counter (`workspaces/{id}/rateLimits/{bucket}_{window}`), not in-memory,
because serverless function instances don't share memory between
invocations. Scoped per `workspaceId:visitorSessionId`. Fails open (allows
the request) if Firestore isn't reachable, so a rate-limiter outage doesn't
take down the whole chat feature — paired with the hard message-length cap
(`MAX_MESSAGE_LENGTH = 2000`) that doesn't depend on Firestore at all.

## Reference implementation

`src/lib/workspace/widgetSnippet.ts` generates a small, functional inline
`<script>` — a floating chat bubble that calls `POST /api/chat` directly,
shown in `/app/settings`. It's a **real, working integration** against the
real API contract, tested by exercising the same endpoint the orchestrator
tests cover — but it is a plain inline script, not a polished/branded
embeddable widget bundle with its own build pipeline, positioning options,
or theming. Treat it as the reference implementation a real widget UI would
replace; building that polished widget is explicitly deferred (it's not part
of proving the core loop works).

## Conversation continuity

The widget keeps `visitorSessionId` in `localStorage` and the current
`conversationId` in a JS variable (lost on page reload — a known MVP
limitation; persisting it across page loads is NOT IMPLEMENTED). Each
`POST /api/chat` either continues an existing conversation (if
`conversationId` is valid and exists) or starts a new one.
