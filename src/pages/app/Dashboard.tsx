import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { Users, MessageCircleWarning, MessageSquare, PlugZap, AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/app/PageHeader";

interface Counts {
  newLeads: number;
  needsHuman: number;
  totalConversations: number;
}

/**
 * Answers the priority questions from docs/PRODUCT_SPEC.md, not vanity
 * metrics: new leads, who needs a human, recent activity, and whether the
 * chatbot is even configured yet.
 */
export default function Dashboard() {
  const { workspace } = useWorkspace();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workspace || !db) return;
    let cancelled = false;

    async function load() {
      try {
        const leadsRef = collection(db!, "workspaces", workspace!.id, "leads");
        const conversationsRef = collection(db!, "workspaces", workspace!.id, "conversations");

        const [newLeadsSnap, needsHumanSnap, totalConvSnap] = await Promise.all([
          getCountFromServer(query(leadsRef, where("status", "==", "new"))),
          getCountFromServer(query(conversationsRef, where("status", "==", "needs_human"))),
          getCountFromServer(conversationsRef),
        ]);

        if (cancelled) return;
        setCounts({
          newLeads: newLeadsSnap.data().count,
          needsHuman: needsHumanSnap.data().count,
          totalConversations: totalConvSnap.data().count,
        });
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

  return (
    <div>
      <PageHeader title="Dashboard" description={`Welcome back — here's what's happening in ${workspace.name}.`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="New leads" value={counts?.newLeads} href="/app/leads" error={error} />
        <StatCard
          icon={MessageCircleWarning}
          label="Needs a human"
          value={counts?.needsHuman}
          href="/app/conversations"
          error={error}
          highlight={Boolean(counts?.needsHuman)}
        />
        <StatCard icon={MessageSquare} label="Conversations" value={counts?.totalConversations} href="/app/conversations" error={error} />
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
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Couldn't load live counts. Something may be broken — check Settings.
        </p>
      )}
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
