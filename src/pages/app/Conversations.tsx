import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiPost } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { CustomerTimeline } from "@/components/CustomerTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Conversation, ConversationStatus, Message } from "@/types/conversation";
import type { BusinessEvent } from "@/types/event";

const STATUS_TONE: Record<ConversationStatus, "info" | "warning" | "success"> = {
  active: "info",
  needs_human: "warning",
  resolved: "success",
};

const STATUS_ORDER: ConversationStatus[] = ["needs_human", "active", "resolved"];

export default function Conversations() {
  const { workspace } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ConversationStatus | "all">("all");

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "conversations"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => d.data() as Conversation);
      setConversations(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
    });
  }, [workspace]);

  const sorted = conversations
    ? [...conversations]
        .filter((conversation) => view === "all" || conversation.status === view)
        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    : null;

  if (!workspace) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Inbox"
        description="Customer conversations with AI/human state, lead context, intent, and business timeline."
      />

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Inbox views">
        {(["all", "needs_human", "active", "resolved"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => setView(item)}
            className={cn(
              "min-h-10 rounded-md px-3 py-1.5 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              view === item ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item.replace("_", " ")}
          </button>
        ))}
      </div>

      {sorted === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No conversations yet" description="Visitor conversations from your website chat will appear here." />
      ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr_300px]">
          <div className="flex flex-col gap-2">
            {sorted.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "rounded-lg border border-border p-3 text-left text-sm hover:bg-muted",
                  selectedId === c.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.customerId ? `Customer ${c.customerId.slice(-6)}` : c.id.slice(0, 8)}</span>
                  <Badge tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {c.latestIntent ? `Intent: ${c.latestIntent}` : "Intent not detected yet"}
                </p>
                {c.status === "needs_human" && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Human response required
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
          <div>
            {selectedId ? (
              <ConversationDetail workspaceId={workspace.id} conversationId={selectedId} />
            ) : (
              <Card className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                Select a conversation to view messages.
              </Card>
            )}
          </div>
          <ConversationContext conversation={sorted.find((conversation) => conversation.id === selectedId) ?? null} />
        </div>
      )}
    </div>
  );
}

function ConversationContext({ conversation }: { conversation: Conversation | null }) {
  const [actionState, setActionState] = useState<string>("");

  async function requestHandoff() {
    if (!conversation) return;
    setActionState("Saving...");
    try {
      await apiPost(`/api/workspaces/${conversation.workspaceId}/actions`, {
        type: "request_handoff",
        workspaceId: conversation.workspaceId,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        idempotencyKey: `operator:${conversation.id}:handoff:${Date.now()}`,
        proposedBy: { type: "user" },
        rationale: "Operator requested human review from Inbox.",
        payload: { reason: "Operator requested human review." },
      });
      setActionState("Handoff saved.");
    } catch {
      setActionState("Action failed.");
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Context</h3>
      {conversation ? (
        <div className="mt-3 space-y-4">
          <dl className="grid gap-3 text-sm">
            <ContextDetail label="Status" value={conversation.status.replace("_", " ")} />
            <ContextDetail label="Channel" value={conversation.channel} />
            <ContextDetail label="Intent" value={conversation.latestIntent ?? "Unknown"} />
            <ContextDetail label="Lead" value={conversation.leadId ?? "Not linked"} />
            <ContextDetail label="Updated" value={new Date(conversation.updatedAt).toLocaleString()} />
          </dl>
          {conversation.customerId && (
            <Link to={`/app/customers/${conversation.customerId}`} className="text-sm font-medium text-primary underline">
              Open customer profile
            </Link>
          )}
          <button
            type="button"
            onClick={() => void requestHandoff()}
            disabled={conversation.status === "needs_human"}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
          >
            Request handoff
          </button>
          {actionState && <p className="text-xs text-muted-foreground">{actionState}</p>}
          <ConversationTimeline workspaceId={conversation.workspaceId} conversationId={conversation.id} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Select a conversation to see context.</p>
      )}
    </Card>
  );
}

function ConversationTimeline({ workspaceId, conversationId }: { workspaceId: string; conversationId: string }) {
  const [events, setEvents] = useState<BusinessEvent[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "events"),
      where("conversationId", "==", conversationId),
      orderBy("occurredAt", "desc")
    );
    return onSnapshot(q, (snap) => setEvents(snap.docs.map((doc) => doc.data() as BusinessEvent)));
  }, [conversationId, workspaceId]);

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Timeline</h4>
      <CustomerTimeline events={events.slice(0, 5)} />
    </div>
  );
}

function ContextDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function ConversationDetail({ workspaceId, conversationId }: { workspaceId: string; conversationId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => d.data() as Message)));
  }, [workspaceId, conversationId]);

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      {messages === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", roleClasses(m.role))}>
            <p className="mb-1 text-xs uppercase tracking-wide opacity-70">{m.role}</p>
            {m.content}
          </div>
        ))
      )}
    </Card>
  );
}

function roleClasses(role: Message["role"]): string {
  if (role === "visitor") return "self-start bg-muted";
  if (role === "assistant") return "self-start bg-primary/10";
  if (role === "human") return "self-start bg-emerald-500/10";
  return "self-start bg-muted text-muted-foreground";
}
