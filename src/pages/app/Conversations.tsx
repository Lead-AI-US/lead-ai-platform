import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Conversation, ConversationStatus, Message } from "@/types/conversation";

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

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "conversations"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snap) => setConversations(snap.docs.map((d) => d.data() as Conversation)));
  }, [workspace]);

  const sorted = conversations
    ? [...conversations].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    : null;

  if (!workspace) return null;

  return (
    <div>
      <PageHeader title="Conversations" description="Needs Human first, then Active, then Resolved." />

      {sorted === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No conversations yet" description="Visitor conversations from your website chat will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
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
                  <span className="font-medium">{c.id.slice(0, 8)}…</span>
                  <Badge tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ")}</Badge>
                </div>
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
        </div>
      )}
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
