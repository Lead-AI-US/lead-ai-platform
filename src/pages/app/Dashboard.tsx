import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Users, MessageCircleWarning, MessageSquare, PlugZap, AlertTriangle, BookOpen, GitBranch } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

        const [newLeadsSnap, needsHumanSnap, totalConvSnap, approvedKnowledgeSnap, customersSnap, knowledgeGapSnap, eventsSnap, leadsSnap] =
          await Promise.all([
          getCountFromServer(query(leadsRef, where("status", "==", "new"))),
          getCountFromServer(query(conversationsRef, where("status", "==", "needs_human"))),
          getCountFromServer(conversationsRef),
          getCountFromServer(query(knowledgeRef, where("status", "==", "approved"))),
          getCountFromServer(customersRef),
          getCountFromServer(query(eventsRef, where("type", "==", "knowledge_missing"))),
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
        title="Good morning"
        description={`Here is what needs attention today in ${workspace.name}.`}
      />

      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle>Attention Required</CardTitle>
        </CardHeader>
        <CardContent>
          {counts === null && !error ? (
            <p className="text-sm text-muted-foreground">Loading workspace attention…</p>
          ) : attention.length ? (
            <div className="flex flex-col gap-2">
              {attention.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
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
          <CardTitle>Business brief</CardTitle>
        </CardHeader>
        <CardContent>
          {counts === null && !error ? (
            <p className="text-sm text-muted-foreground">Loading deterministic brief…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{counts?.customers ?? 0} customer records</li>
                <li>{counts?.totalConversations ?? 0} customer conversations</li>
                <li>{counts?.newLeads ?? 0} new leads captured</li>
                <li>{counts?.needsHuman ?? 0} handoffs waiting for your team</li>
                <li>{counts?.knowledgeGaps ?? 0} recorded knowledge gaps</li>
              </ul>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Recommended actions</p>
                {actions.length ? (
                  actions.map((action) => (
                    <Link key={action.id} to={action.destination} className="block rounded-md border border-border p-3 text-sm hover:bg-muted">
                      <span className="font-medium">{action.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{action.description}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recommended actions from current workspace state.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="h-4 w-4" /> Chatbot status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {widgetConfigured ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Widget configured and ready.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not configured yet.{" "}
                <Link to="/app/settings" className="underline">
                  Add an allowed origin
                </Link>{" "}
                to install it.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> AI health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">OpenAI server adapter</span>
              <Badge>Unknown</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Knowledge readiness</span>
              <Badge tone={counts?.approvedKnowledge ? "success" : "warning"}>
                {counts?.approvedKnowledge ? "Approved sources available" : "No approved sources"}
              </Badge>
            </div>
          </CardContent>
        </Card>
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
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length ? (
            <div className="grid gap-2">
              {events.slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <span>{event.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
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
          <AlertTriangle className="h-4 w-4" /> Couldn't load live counts. Something may be broken — check Settings.
        </p>
      )}

      <p className="text-xs text-muted-foreground">Last refreshed: {formatDateTime(new Date().toISOString())}</p>
    </div>
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
      <Card className={highlight ? "border-amber-500/50" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" /> {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{error ? "—" : (value ?? "…")}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
