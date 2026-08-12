import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiPatch } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/types/lead";

const STATUS_TONE: Record<LeadStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  new: "info",
  reviewed: "neutral",
  contacted: "warning",
  qualified: "success",
  not_ready: "neutral",
  closed: "danger",
};

export default function Leads() {
  const { workspace } = useWorkspace();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setLeads(snap.docs.map((d) => d.data() as Lead)));
  }, [workspace]);

  if (!workspace) return null;

  const filtered =
    leads?.filter((lead) => {
      const matchesStatus = status === "all" || lead.status === status;
      const matchesSearch = [lead.name, lead.email, lead.phone, lead.message, lead.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    }) ?? null;

  async function updateStatus(leadId: string, status: LeadStatus) {
    await apiPatch(`/api/workspaces/${workspace!.id}/leads/${leadId}`, { status });
  }

  return (
    <div>
      <PageHeader
        eyebrow="CRM-lite"
        title="Leads"
        description="Workspace-scoped leads from real website chat and manual records."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative block text-sm">
          <span className="sr-only">Search leads</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            placeholder="Search leads"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Filter leads by status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus | "all")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {leads === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered?.length === 0 ? (
        <EmptyState icon={Users} title="No leads yet" description="Leads captured by your website chat will show up here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name / contact</th>
                <th className="p-3 font-medium">Message</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Conversation</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{lead.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{lead.email || lead.phone || "no contact info"}</div>
                  </td>
                  <td className="max-w-xs truncate p-3 text-muted-foreground">{lead.message || "—"}</td>
                  <td className="p-3">
                    <Badge>{lead.source === "website_chat" ? "Website chat" : "Manual"}</Badge>
                  </td>
                  <td className="p-3">
                    {lead.conversationId ? (
                      <Link to="/app/inbox" className="text-xs font-medium text-primary underline">
                        Open inbox
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">No conversation</span>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={lead.status}
                      onChange={(e) => void updateStatus(lead.id, e.target.value as LeadStatus)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Badge tone={STATUS_TONE[lead.status]} className="ml-2 hidden sm:inline-flex">
                      {lead.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
