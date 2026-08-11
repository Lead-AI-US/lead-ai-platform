# Customer Intelligence

Customers now exist independently of conversations and leads.

The website chat API upserts a deterministic customer record from the visitor session, then links:

```text
customerId -> conversationId -> leadId -> events
```

The customer profile at `/app/customers/:customerId` shows identity, latest intent, related conversations, related leads, and an ordered timeline from `workspaces/{workspaceId}/events`.

No destructive migration runs automatically. Existing conversations/leads without `customerId` remain valid and can be linked later with a dry-run backfill script.
