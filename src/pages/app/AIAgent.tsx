import { Bot, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

export default function AIAgent() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  const websiteConfigured = workspace.allowedOrigins.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control Center"
        title="AI Agent"
        description="Real workspace configuration for provider readiness, website channel status, knowledge behavior, and safety posture."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" aria-hidden="true" /> Agent readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Provider" value="OpenAI server adapter" />
              <Detail label="Model" value="Server configured" tone="neutral" />
              <Detail label="Prompt version" value="Policy-managed" />
              <Detail label="Workspace" value={workspace.name} />
              <Detail label="Website channel" value={websiteConfigured ? "Allowed origin configured" : "Configuration required"} tone={websiteConfigured ? "success" : "warning"} />
              <Detail label="Handoff behavior" value="Needs Human status supported" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The server orchestration path includes security pre-checks, policy validation, structured responses, and
              workspace-scoped knowledge retrieval.
            </p>
            <Badge tone="success">Server guarded</Badge>
            <Badge tone={websiteConfigured ? "success" : "warning"} className="ml-2">
              {websiteConfigured ? "Website channel ready" : "Widget origin missing"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Your Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Synthetic test execution should be marked with <code>isTest: true</code> by the server path before it is
            included in analytics.
          </p>
          <label className="grid gap-2 text-sm font-medium">
            Test message
            <textarea
              rows={4}
              placeholder="Ask a safe test question for this workspace"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </label>
          <Button type="button" disabled>
            Test runner not configured
          </Button>
        </CardContent>
      </Card>
    </div>
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
      <dd className="mt-1">
        {tone ? <Badge tone={tone}>{value}</Badge> : <span>{value}</span>}
      </dd>
    </div>
  );
}
