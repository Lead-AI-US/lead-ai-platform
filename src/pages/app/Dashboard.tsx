import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  GitBranch,
  MessageCircleWarning,
  MessageSquare,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SpatialCard, SpatialCardContent } from "@/components/spatial/SpatialCard";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { deriveNextBestActions, type NextBestAction } from "@/lib/intelligence/nextBestAction";
import type { BusinessEvent } from "@/types/event";
import type { Lead } from "@/types/lead";

interface Counts {
  newLeads: number;
  needsHuman: number;
  totalConversations: number;
  approvedKnowledge: number;
  customers: number;
  knowledgeGaps: number;
  aiActions: number;
  automationRuns: number;
}

/**
 * Answers the priority questions from docs/PRODUCT_SPEC.md, not vanity
 * metrics: new leads, who needs a human, recent activity, and whether the
 * chatbot is even configured yet.
 */
export default function Dashboard() {
  const { workspace } = useWorkspace();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [actions, setActions] = useState<NextBestAction[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workspace || !db) return;
    let cancelled = false;

    async function load() {
      try {
        const leadsRef = collection(db!, "workspaces", workspace!.id, "leads");
        const conversationsRef = collection(db!, "workspaces", workspace!.id, "conversations");
        const knowledgeRef = collection(db!, "workspaces", workspace!.id, "knowledgeSources");
        const customersRef = collection(db!, "workspaces", workspace!.id, "customers");
        const eventsRef = collection(db!, "workspaces", workspace!.id, "events");
        const actionsRef = collection(db!, "workspaces", workspace!.id, "agentActions");
        const automationRunsRef = collection(db!, "workspaces", workspace!.id, "automationRuns");

        const [
          newLeadsSnap,
          needsHumanSnap,
          totalConvSnap,
          approvedKnowledgeSnap,
          customersSnap,
          knowledgeGapSnap,
          aiActionsSnap,
          automationRunsSnap,
          eventsSnap,
          leadsSnap,
        ] =
          await Promise.all([
          getCountFromServer(query(leadsRef, where("status", "==", "new"))),
          getCountFromServer(query(conversationsRef, where("status", "==", "needs_human"))),
          getCountFromServer(conversationsRef),
          getCountFromServer(query(knowledgeRef, where("status", "==", "approved"))),
          getCountFromServer(customersRef),
          getCountFromServer(query(eventsRef, where("type", "==", "knowledge_missing"))),
          getCountFromServer(actionsRef),
          getCountFromServer(automationRunsRef),
          getDocs(query(eventsRef, orderBy("occurredAt", "desc"), limit(12))),
          getDocs(query(leadsRef, orderBy("createdAt", "desc"), limit(50))),
        ]);

        if (cancelled) return;
        const nextCounts = {
          newLeads: newLeadsSnap.data().count,
          needsHuman: needsHumanSnap.data().count,
          totalConversations: totalConvSnap.data().count,
          approvedKnowledge: approvedKnowledgeSnap.data().count,
          customers: customersSnap.data().count,
          knowledgeGaps: knowledgeGapSnap.data().count,
          aiActions: aiActionsSnap.data().count,
          automationRuns: automationRunsSnap.data().count,
        };
        const recentEvents = eventsSnap.docs.map((doc) => doc.data() as BusinessEvent);
        const recentLeads = leadsSnap.docs.map((doc) => doc.data() as Lead);
        setCounts({
          ...nextCounts,
        });
        setEvents(recentEvents);
        setActions(deriveNextBestActions({ leads: recentLeads, events: recentEvents, approvedKnowledgeCount: nextCounts.approvedKnowledge }));
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  if (!workspace) return null;

  const widgetConfigured = workspace.allowedOrigins.length > 0;
  const attention = [
    ...(counts?.needsHuman ? [`${counts.needsHuman} conversation${counts.needsHuman === 1 ? "" : "s"} need a human`] : []),
    ...(counts?.approvedKnowledge === 0 ? ["No approved knowledge is available for AI responses"] : []),
    ...(!widgetConfigured ? ["Website widget origin is not configured"] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="AI Business Command Center"
        description={`Here is what Lead.AI is handling for ${workspace.name}. Metrics are loaded from this workspace only.`}
      />

      <SpatialCard className="overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-accent/10 to-transparent md:block" aria-hidden="true" />
        <SpatialCardContent className="grid gap-6 pt-5 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-accent-soft text-accent shadow-glow">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-4xl">Good evening. Your operating layer is watching the lead flow.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Lead.AI connects conversations, leads, knowledge, action policy, and automation runs into one workspace view.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-border bg-surface/70 p-3">
            <SystemRow label="Tenant scope" value="Active workspace only" tone="success" />
            <SystemRow label="Action policy" value="Server gated" tone="success" />
            <SystemRow label="Live preview" value="Blocked infrastructure" tone="warning" />
            <SystemRow label="OpenAI live" value="Blocked infrastructure" tone="warning" />
          </div>
        </SpatialCardContent>
      </SpatialCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="New leads" value={counts?.newLeads} href="/app/leads" error={error} />
        <StatCard
          icon={MessageCircleWarning}
          label="Needs a human"
          value={counts?.needsHuman}
          href="/app/inbox"
          error={error}
          highlight={Boolean(counts?.needsHuman)}
        />
        <StatCard icon={MessageSquare} label="Conversations" value={counts?.totalConversations} href="/app/inbox" error={error} />
        <StatCard icon={BookOpen} label="Approved knowledge" value={counts?.approvedKnowledge} href="/app/knowledge" error={error} />
        <StatCard icon={Zap} label="AI actions" value={counts?.aiActions} href="/app/ai-agent" error={error} />
        <StatCard icon={Workflow} label="Automation runs" value={counts?.automationRuns} href="/app/automations" error={error} />
        <StatCard icon={Activity} label="Customers" value={counts?.customers} href="/app/customers" error={error} />
        <StatCard icon={AlertTriangle} label="Knowledge gaps" value={counts?.knowledgeGaps} href="/app/analytics" error={error} highlight={Boolean(counts?.knowledgeGaps)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Attention queue</CardTitle>
          </CardHeader>
          <CardContent>
            {counts === null && !error ? (
              <p className="text-sm text-muted-foreground">Loading workspace attention...</p>
            ) : attention.length ? (
              <div className="grid gap-2">
                {attention.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attention items right now.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.length ? (
              actions.map((action) => (
                <Link key={action.id} to={action.destination} className="block rounded-lg border border-border bg-surface/60 p-3 text-sm transition-colors hover:border-border-hover hover:bg-surface-interactive">
                  <span className="font-medium">{action.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recommended actions from current workspace state.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HealthCard icon={PlugZap} title="Chatbot status" label="Website Widget" value={widgetConfigured ? "Origin configured" : "Origin missing"} tone={widgetConfigured ? "success" : "warning"} href="/app/settings" />
        <HealthCard icon={ShieldCheck} title="AI safety" label="Knowledge readiness" value={counts?.approvedKnowledge ? "Approved sources available" : "No approved sources"} tone={counts?.approvedKnowledge ? "success" : "warning"} href="/app/knowledge" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Integration health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Firebase</span>
              <Badge tone={db ? "success" : "warning"}>{db ? "Client available" : "Configuration required"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Website Widget</span>
              <Badge tone={widgetConfigured ? "success" : "warning"}>{widgetConfigured ? "Origin configured" : "Origin missing"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">External providers</span>
              <Badge>Not configured</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI activity feed</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length ? (
            <div className="grid gap-2">
              {events.slice(0, 6).map((event) => (
                <div key={event.id} className="grid gap-2 rounded-lg border border-border bg-surface/60 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <span className="font-medium capitalize">{event.type.replace(/_/g, " ")}</span>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{event.source.channel ?? "workspace"}</span>
                      <span>{event.actor.type}</span>
                      {typeof event.metadata.status === "string" && <span>{event.metadata.status}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground sm:text-right">{formatDateTime(event.occurredAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No business events have been recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Couldn't load live counts. Something may be broken - check Settings.
        </p>
      )}

      <p className="text-xs text-muted-foreground">Last refreshed: {formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}

function SystemRow({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  label,
  value,
  tone,
  href,
}: {
  icon: typeof PlugZap;
  title: string;
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
  href: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden="true" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{label}</span>
          <Badge tone={tone}>{value}</Badge>
        </div>
        <Link to={href} className="text-xs font-medium text-accent underline-offset-4 hover:underline">
          Open settings
        </Link>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  error,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: number | undefined;
  href: string;
  error: boolean;
  highlight?: boolean;
}) {
  return (
    <Link to={href}>
      <Card className={highlight ? "border-amber-500/50 bg-amber-500/5" : "transition-transform motion-safe:hover:-translate-y-0.5"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" /> {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{error ? "-" : (value ?? "...")}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
