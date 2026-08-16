import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { PlayCircle, Workflow } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { db } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import type { Automation, AutomationRun } from "@/types/automation";

const templates = [
  ["New Lead Follow-up", "When a lead is created, prepare a follow-up action for the team."],
  ["Missed Lead Recovery", "Detect leads that have gone untouched and recommend outreach."],
  ["Appointment Follow-up", "Prepare post-booking follow-up once bookings are connected."],
  ["After-Hours Lead Capture", "Route after-hours customer requests into handoff or follow-up."],
  ["Human Escalation", "Flag conversations that need a team member."],
  ["Knowledge Gap Alert", "Surface repeated unknown questions for knowledge creation."],
] as const;

export default function Automations() {
  const { workspace } = useWorkspace();
  const [view, setView] = useState<"templates" | "automations" | "runs">("templates");
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [runs, setRuns] = useState<AutomationRun[] | null>(null);

  useEffect(() => {
    if (!workspace || !db) return;
    const automationsQuery = query(collection(db, "workspaces", workspace.id, "automations"), orderBy("updatedAt", "desc"), limit(50));
    const runsQuery = query(collection(db, "workspaces", workspace.id, "automationRuns"), orderBy("startedAt", "desc"), limit(50));
    const unsubAutomations = onSnapshot(automationsQuery, (snap) => setAutomations(snap.docs.map((doc) => doc.data() as Automation)));
    const unsubRuns = onSnapshot(runsQuery, (snap) => setRuns(snap.docs.map((doc) => doc.data() as AutomationRun)));
    return () => {
      unsubAutomations();
      unsubRuns();
    };
  }, [workspace]);

  if (!workspace) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Automations"
        title="Automations"
        description="Policy-gated automation definitions, execution templates, and server-recorded runs."
      />

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Automation views">
        {(["templates", "automations", "runs"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => setView(item)}
            className="min-h-10 rounded-md px-3 py-1.5 text-sm capitalize text-muted-foreground hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {item}
          </button>
        ))}
      </div>

      {view === "templates" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map(([name, description]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-4 w-4" aria-hidden="true" /> {name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{description}</p>
                <Badge>Template</Badge>
                <Badge className="ml-2" tone="success">Policy gated</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "automations" && (
        automations === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : automations.length === 0 ? (
          <EmptyState icon={Workflow} title="No automations yet" description="Server-managed automations will appear here when configured." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardHeader>
                  <CardTitle>{automation.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Badge tone={automation.enabled ? "success" : "neutral"}>{automation.enabled ? "Enabled" : "Disabled"}</Badge>
                  <Detail label="Trigger" value={automation.trigger.type.replace(/_/g, " ")} />
                  <Detail label="Actions" value={String(automation.actions.length)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {view === "runs" && (
        runs === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : runs.length === 0 ? (
          <EmptyState icon={PlayCircle} title="No automation runs yet" description="Automation executions will appear after server-side triggers run." />
        ) : (
          <div className="grid gap-3">
            {runs.map((run) => (
              <Card key={run.id}>
                <CardContent className="grid gap-2 pt-4 text-sm md:grid-cols-[1fr_auto_auto]">
                  <div>
                    <div className="font-medium">{run.automationId}</div>
                    <div className="text-xs text-muted-foreground">Source event {run.sourceEventId}</div>
                  </div>
                  <Badge tone={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "warning"}>{run.status}</Badge>
                  <div className="text-xs text-muted-foreground">{formatDateTime(run.startedAt)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
