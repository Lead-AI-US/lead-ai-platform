# API

Detailed reference implementing what `docs/API_SPEC.md` sketched before any
code existed — see that file for the (superseded) original plan. Every
endpoint below is real code in `api/`, covered by
`docs/AUTHORIZATION.md`'s matrix.

All error responses: `{ "error": "<code>" }` (never a stack trace or
internal detail — `src/lib/http/apiHelpers.ts::safeServerError`).

## `POST /api/workspaces`

Onboarding. Body: `{ businessName, businessType, timezone, primaryGoal, websiteDomain? }`
(validated by `OnboardingSchema`). Creates a `Workspace` and an `owner`
`WorkspaceMember` in one Firestore batch. Requires auth; does not require an
existing workspace. → `201 { workspace }`.

## `PATCH /api/workspaces/:workspaceId`

Body: `{ allowedOrigins?, timezone?, status? }` (`UpdateWorkspaceSettingsSchema`).
Requires `admin`. Records a `workspace_settings_changed` audit event.

## `GET /api/workspaces/:workspaceId/leads`

Requires `viewer`. Returns `{ leads: Lead[] }`, newest first, capped at 200.

## `POST /api/workspaces/:workspaceId/leads`

Body: `{ source, name?, email?, phone?, message?, conversationId? }`
(`CreateLeadSchema`). Requires `member`. → `201 { lead }`.

## `PATCH /api/workspaces/:workspaceId/leads/:leadId`

Body: `{ status }` (`UpdateLeadStatusSchema`, one of `LEAD_STATUSES`).
Requires `member`. Records a `lead_status_changed` audit event.

## `GET /api/workspaces/:workspaceId/knowledge`

Requires `viewer`. Returns `{ knowledge: KnowledgeSource[] }`.

## `POST /api/workspaces/:workspaceId/knowledge`

Body: `{ title, content }` (`CreateKnowledgeSchema`). Requires `admin`.
Always created with `status: "draft"` — never directly approved.

## `PATCH /api/workspaces/:workspaceId/knowledge/:knowledgeId`

Body: `{ status }` (`draft | approved | archived`). Requires `admin`.
Stamps `approvedBy`/`approvedAt` when transitioning to `approved`.

## `GET /api/workspaces/:workspaceId/analytics/summary?timeRange=7d|30d|all`

Requires `viewer`. `timeRange` defaults to `30d` if omitted; any value other
than `7d`/`30d`/`all` is a `400 invalid_time_range` (never silently
interpreted as `all`). Aggregates `analyticsEvents` where `isTest == false`
server-side — never a client-side full scan. Returns `AnalyticsSummary`
(`src/types/analytics.ts`), including a truthful `hasData: false` when there's
nothing yet.

## `GET /api/workspaces/:workspaceId/analytics/journey?timeRange=7d|30d|all`

Requires `viewer`. Aggregates workspace business events server-side and returns
event counts plus top conversation transitions only. It does not return message
bodies, contact details, or raw customer PII.

## `GET /api/workspaces/:workspaceId/search?q=...`

Requires `viewer`. Bounded workspace search across recent leads, customers,
conversations, knowledge sources, AI assets, and integration metadata. Each
collection query is scoped to `workspaces/{workspaceId}` and capped before
server-side matching.

## `POST /api/workspaces/:workspaceId/actions`

Requires `member`. Proposes and, when policy permits, executes a supported
action through the central action engine. Returns the persisted action, policy
decision, and execution result. Unsupported actions return
`ACTION_NOT_SUPPORTED`; approval-required actions return policy output without
execution.

## `POST /api/workspaces/:workspaceId/actions/simulate`

Requires `viewer`. Runs schema/risk/policy checks and returns expected effects
without mutation.

## `POST /api/workspaces/:workspaceId/agent/test`

Requires `viewer`. Calls the same approved-knowledge AI orchestration path as
production chat and returns a structured dry-run result with simulated actions.
It returns `persisted: false` and does not create conversations, leads, or
analytics events.

## `POST /api/chat`

The public website-chat widget endpoint — see `docs/WIDGET.md` for the full
flow. Body: `{ widgetKey, conversationId?, visitorSessionId, message }`
(`ChatMessageInputSchema`, message capped at 2000 chars). No Firebase auth —
authorized instead by `publicWidgetKey` resolution + `Origin` allowlist +
per-visitor rate limit. → `200 { conversationId, reply, intent, shouldRequestHandoff }`,
or `403 origin_not_allowed`, `404 widget_not_found`, `429 rate_limited`.
