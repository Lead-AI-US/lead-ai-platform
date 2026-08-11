# Security Model

Security principles preserved in Lead.AI 3.0:

```text
Firebase ID token verification for APIs
workspaceMembers-derived authorization
fail-closed role checks
client read-only access for workspace data
server-only writes for customers, leads, conversations, events, knowledge, audit
approved knowledge only for customer-facing AI
metadata redaction before analytics/events
no provider secrets in Firestore or browser config
```

Firestore rules allow active members to read their own workspace customer-domain records and deny cross-workspace access. Customer-domain writes go through Vercel Functions using Firebase Admin.

Rule tests cover same-workspace read, cross-workspace denial, unauthenticated denial, and direct client write denial for leads, customers, and events.
