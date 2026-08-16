import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { BarChart3 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { apiGet } from "@/lib/api/client";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import type { AnalyticsSummary } from "@/types/analytics";
import type { BusinessEvent } from "@/types/event";
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
  const [journey, setJourney] = useState<JourneyAnalytics | null>(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState<BusinessEvent[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setSummary(null);
    setJourney(null);
    setError(false);
    apiGet<AnalyticsSummary>(`/api/workspaces/${workspace.id}/analytics/summary?timeRange=${range}`)
      .then(setSummary)
      .catch(() => setError(true));
    apiGet<JourneyAnalytics>(`/api/workspaces/${workspace.id}/analytics/journey?timeRange=${range}`)
      .then(setJourney)
      .catch(() => setError(true));
    if (db) {
      const gapsQuery = query(
        collection(db, "workspaces", workspace.id, "events"),
        where("type", "==", "knowledge_missing"),
        orderBy("occurredAt", "desc"),
        limit(20)
      );
      void getDocs(gapsQuery).then((snap) => setKnowledgeGaps(snap.docs.map((doc) => doc.data() as BusinessEvent)));
    }
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
          {journey && (
            <Card>
              <CardHeader>
                <CardTitle>Customer journey</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {Object.entries(journey.eventCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([type, count]) => (
                      <FunnelRow key={type} step={formatEventType(type)} count={count} max={journey.totalEvents || 1} />
                    ))}
                  {journey.totalEvents === 0 && <p className="text-sm text-muted-foreground">No journey events in this range.</p>}
                </div>
                <div className="space-y-2">
                  {journey.transitions.length ? (
                    journey.transitions.map((transition) => (
                      <div key={`${transition.from}-${transition.to}`} className="rounded-md border border-border p-3 text-sm">
                        <div className="font-medium">
                          {formatEventType(transition.from)} {"->"} {formatEventType(transition.to)}
                        </div>
                        <div className="text-xs text-muted-foreground">{transition.count} transition{transition.count === 1 ? "" : "s"}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No repeated conversation transitions yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Knowledge gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {knowledgeGaps.length ? (
                knowledgeGaps.map((gap) => (
                  <div key={gap.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="font-medium">{typeof gap.metadata.intent === "string" ? gap.metadata.intent : "Unknown question"}</div>
                    <div className="text-xs text-muted-foreground">Last asked {formatDateTime(gap.occurredAt)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No knowledge gaps recorded in business events yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface JourneyAnalytics {
  eventCounts: Record<string, number>;
  transitions: { from: string; to: string; count: number }[];
  totalEvents: number;
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

function formatEventType(type: string): string {
  return type.replace(/_/g, " ");
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
