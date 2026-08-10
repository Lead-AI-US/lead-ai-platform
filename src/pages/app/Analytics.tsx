import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiGet } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AnalyticsSummary } from "@/types/analytics";
import type { TimeRange } from "@/lib/analytics/timeRange";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export default function Analytics() {
  const { workspace } = useWorkspace();
  const [range, setRange] = useState<TimeRange>("30d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setSummary(null);
    setError(false);
    apiGet<AnalyticsSummary>(`/api/workspaces/${workspace.id}/analytics/summary?timeRange=${range}`)
      .then(setSummary)
      .catch(() => setError(true));
  }, [workspace, range]);

  if (!workspace) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Real persisted analytics events only. Test events are excluded by the server summary."
      />

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <Button key={r.value} variant={range === r.value ? "primary" : "secondary"} onClick={() => setRange(r.value)}>
            {r.label}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">Couldn't load analytics right now.</p>
      ) : summary === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !summary.hasData ? (
        <EmptyState icon={BarChart3} title="No activity yet" description="Once your chatbot has real conversations, metrics will appear here." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Conversations" value={summary.metrics.conversations} />
            <Metric label="Assistant replies" value={summary.metrics.assistantResponses} />
            <Metric label="Leads" value={summary.metrics.leads} />
            <Metric label="Human handoffs" value={summary.metrics.handoffs} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Workspace funnel</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {summary.funnel.map((step) => (
                <FunnelRow key={step.step} step={step.step} count={step.count} max={summary.funnel[0]?.count || 1} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function FunnelRow({ step, count, max }: { step: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{step}</span>
        <span>{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
