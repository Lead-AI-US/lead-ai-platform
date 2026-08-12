# Business Event Model

Business events are canonical, tenant-scoped records:

```ts
type BusinessEvent = {
  id: string;
  workspaceId: string;
  type: string;
  customerId?: string;
  leadId?: string;
  conversationId?: string;
  actor: { type: "customer" | "ai" | "user" | "system"; id?: string };
  source: { channel?: string; integration?: string };
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: string;
};
```

Events are written through `src/server/events/eventService.ts`.

Metadata is allow-listed and redacted. Secret-bearing keys such as authorization, token, cookie, OpenAI key, Firebase private key, password, or provider credential fields are dropped.

Initial event writers:

```text
api/chat.ts
api/workspaces/{workspaceId}/leads/{leadId}.ts
```
