import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Users } from "lucide-react";
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

  useEffect(() => {
    if (!workspace || !db) return;
    const q = query(collection(db, "workspaces", workspace.id, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setLeads(snap.docs.map((d) => d.data() as Lead)));
  }, [workspace]);

  if (!workspace) return null;

  async function updateStatus(leadId: string, status: LeadStatus) {
    await apiPatch(`/api/workspaces/${workspace!.id}/leads/${leadId}`, { status });
  }

  return (
    <div>
      <PageHeader title="Leads" description="Everyone who's reached out through your chatbot or been added manually." />

      {leads === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : leads.length === 0 ? (
        <EmptyState icon={Users} title="No leads yet" description="Leads captured by your website chat will show up here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Name / contact</th>
                <th className="p-3 font-medium">Message</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
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
