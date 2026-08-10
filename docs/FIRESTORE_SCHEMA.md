# Firestore Schema

All timestamps are ISO 8601 strings (`src/types/firestoreTimestamp.ts`), not
raw Firestore `Timestamp` objects — see that file for why. All server writes
use `firebase-admin`; the client SDK is read-mostly (see
`docs/AUTHORIZATION.md` and `firebase/firestore.rules`).

```
users/{uid}
  UserProfile — src/types/user.ts
  Written by: the user themself, once, at signup.

workspaces/{workspaceId}
  Workspace — src/types/workspace.ts
  Written by: api/workspaces (create), api/workspaces/[workspaceId] (settings).
  Read by: any active member (client SDK, gated by rules).

workspaceMembers/{workspaceId}_{uid}
  WorkspaceMember — src/types/workspace.ts
  Written by: api/workspaces (owner, at creation) - no route adds
  additional members yet (NOT IMPLEMENTED — see MVP_VERIFICATION.md).
  Read by: the member themself only (their own membership docs).

workspaces/{workspaceId}/leads/{leadId}
  Lead — src/types/lead.ts
  Written by: api/workspaces/[id]/leads (manual), api/chat.ts (website_chat).
  Read by: any active member.

workspaces/{workspaceId}/knowledgeSources/{sourceId}
  KnowledgeSource — src/types/knowledge.ts
  Written by: api/workspaces/[id]/knowledge (admin+).
  Read by: any active member (including drafts — a known MVP simplification;
  see docs/SECURITY.md). Only status == "approved" is ever sent to the model.

workspaces/{workspaceId}/conversations/{conversationId}
  Conversation — src/types/conversation.ts
  Written by: api/chat.ts only.
  Read by: any active member.

workspaces/{workspaceId}/conversations/{conversationId}/messages/{messageId}
  Message — src/types/conversation.ts
  Written by: api/chat.ts only.
  Read by: any active member.

workspaces/{workspaceId}/analyticsEvents/{eventId}
  AnalyticsEvent — src/types/analytics.ts
  Written by: src/lib/analytics/track.ts (server only).
  Read by: nobody directly — only via the aggregated
  api/workspaces/[id]/analytics/summary.ts endpoint.

workspaces/{workspaceId}/auditLogs/{entryId}
  AuditLogEntry — src/types/audit.ts
  Written by: src/lib/audit/log.ts (server only).
  Read by: nobody yet — no admin UI for this exists (NOT IMPLEMENTED).

workspaces/{workspaceId}/rateLimits/{windowKey}
  Internal counters for src/lib/http/rateLimit.ts. Server only, no domain type.
```

## Indexes

`firebase/firestore.indexes.json` declares one composite index:
`analyticsEvents` on `(isTest ASC, occurredAt ASC)`, required because
`api/workspaces/[id]/analytics/summary.ts` combines an equality filter
(`isTest == false`) with a range filter (`occurredAt >= cutoff`) — Firestore
requires an explicit composite index for that combination. Every other query
in this codebase is either a single-field filter or multiple *equality*
filters (`workspaceMembers` lookup by `userId` + `status`), both of which
Firestore indexes automatically.

## Why ISO strings instead of Firestore `Timestamp`

The client SDK (`firebase/firestore`) and Admin SDK (`firebase-admin/firestore`)
export incompatible `Timestamp` classes. Domain types shared between client
and server code can't import either without coupling every consumer to one
specific package. ISO strings are trivially serializable, sortable as
strings, and require no conversion at the API boundary.
