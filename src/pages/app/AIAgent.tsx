import { useState } from "react";
import { Bot, FlaskConical, GraduationCap, Rocket, ShieldCheck, BarChart3 } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

const tabs = [
  { id: "overview", label: "Overview", icon: Bot },
  { id: "train", label: "Train", icon: GraduationCap },
  { id: "test", label: "Test", icon: FlaskConical },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "analyze", label: "Analyze", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AIAgent() {
  const { workspace } = useWorkspace();
  const [active, setActive] = useState<TabId>("overview");
  if (!workspace) return null;

  const websiteConfigured = workspace.allowedOrigins.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Agent"
        title="Train, test, deploy, analyze"
        description="Lifecycle controls for the workspace AI agent. Unsupported execution paths are shown honestly as not configured."
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist" aria-label="AI Agent lifecycle">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active === id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {active === "overview" && <Overview websiteConfigured={websiteConfigured} workspaceName={workspace.name} />}
      {active === "train" && <Train />}
      {active === "test" && <Test />}
      {active === "deploy" && <Deploy websiteConfigured={websiteConfigured} />}
      {active === "analyze" && <Analyze />}
    </div>
  );
}

function Overview({ websiteConfigured, workspaceName }: { websiteConfigured: boolean; workspaceName: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" aria-hidden="true" /> Agent status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Workspace" value={workspaceName} />
            <Detail label="Provider" value="OpenAI server adapter" tone="neutral" />
            <Detail label="Website channel" value={websiteConfigured ? "Allowed origin configured" : "Configuration required"} tone={websiteConfigured ? "success" : "warning"} />
            <Detail label="Knowledge" value="Approved-only retrieval" />
            <Detail label="Handoff behavior" value="Needs Human supported" />
            <Detail label="Action execution" value="Server policy gated" />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Safety posture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The production path uses deterministic security pre-checks, structured output, policy validation, and
            workspace-scoped approved knowledge.
          </p>
          <Badge tone="success">Server guarded</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function Train() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Train</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-3">
        <Detail label="Approved knowledge" value="Customer-facing source" tone="success" />
        <Detail label="Draft knowledge" value="Isolated from AI replies" tone="warning" />
        <Detail label="Archived knowledge" value="Unavailable to AI" tone="neutral" />
      </CardContent>
    </Card>
  );
}

function Test() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test your AI agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          rows={4}
          placeholder="Ask a safe test question for this workspace"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <Button type="button" disabled>
          Test execution not configured
        </Button>
        <p className="text-sm text-muted-foreground">Test mode will remain non-mutating until a server test endpoint marks events as synthetic.</p>
      </CardContent>
    </Card>
  );
}

function Deploy({ websiteConfigured }: { websiteConfigured: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Channel name="Website" status={websiteConfigured ? "Connected" : "Configuration required"} tone={websiteConfigured ? "success" : "warning"} />
      <Channel name="WhatsApp" status="Planned" tone="neutral" />
      <Channel name="Instagram" status="Planned" tone="neutral" />
    </div>
  );
}

function Analyze() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Knowledge gaps" value="Recorded from business events" />
        <Detail label="Human handoffs" value="Tracked from conversations and events" />
        <Detail label="Intent distribution" value="Available as event volume grows" />
        <Detail label="Failed actions" value="No action executor configured yet" tone="neutral" />
      </CardContent>
    </Card>
  );
}

function Channel({ name, status, tone }: { name: string; status: string; tone: "neutral" | "warning" | "success" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge tone={tone}>{status}</Badge>
      </CardContent>
    </Card>
  );
}

function Detail({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1">{tone ? <Badge tone={tone}>{value}</Badge> : <span>{value}</span>}</dd>
    </div>
  );
}
