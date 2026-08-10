import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { BookOpen } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiPatch, apiPost } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { KnowledgeSource, KnowledgeStatus } from "@/types/knowledge";
import { roleAtLeast } from "@/types/workspace";

const STATUS_TONE: Record<KnowledgeStatus, "neutral" | "warning" | "success"> = {
  draft: "warning",
  approved: "success",
  archived: "neutral",
};

export default function Knowledge() {
  const { workspace, role } = useWorkspace();
  const [items, setItems] = useState<KnowledgeSource[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canManage = role ? roleAtLeast(role, "admin") : false;

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "knowledgeSources"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => d.data() as KnowledgeSource)));
  }, [workspace]);

  if (!workspace) return null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/api/workspaces/${workspace!.id}/knowledge`, { title, content });
      setTitle("");
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: KnowledgeStatus) {
    await apiPatch(`/api/workspaces/${workspace!.id}/knowledge/${id}`, { status });
  }

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Only approved knowledge is ever used by the AI assistant. Drafts and archived entries are never included."
      />

      {canManage && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <Input placeholder="Title (e.g. Business hours)" required value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                required
                placeholder="Content the assistant is allowed to state as fact"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
              <Button type="submit" disabled={submitting} className="self-start">
                {submitting ? "Adding…" : "Add as draft"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title="No knowledge yet" description="Add what your assistant is allowed to say about this business." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{item.title}</h3>
                  <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.content}</p>
                {canManage && (
                  <div className="flex gap-2">
                    {item.status !== "approved" && (
                      <Button variant="secondary" onClick={() => void setStatus(item.id, "approved")}>
                        Approve
                      </Button>
                    )}
                    {item.status !== "archived" && (
                      <Button variant="ghost" onClick={() => void setStatus(item.id, "archived")}>
                        Archive
                      </Button>
                    )}
                    {item.status === "archived" && (
                      <Button variant="secondary" onClick={() => void setStatus(item.id, "draft")}>
                        Restore to draft
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
