import { Copy } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";
import { widgetSnippet } from "@/lib/workspace/widgetSnippet";

export default function Developer() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  const snippet = widgetSnippet(workspace.publicWidgetKey);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Developer Center"
        title="Developer"
        description="Workspace technical setup for widget installation, CLI diagnostics, and provider readiness."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Workspace ID" value={workspace.id} />
              <Detail label="Public widget key" value={workspace.publicWidgetKey} />
              <Detail label="Allowed origins" value={String(workspace.allowedOrigins.length)} />
              <Detail label="API base" value={window.location.origin} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead.AI CLI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">The CLI is local to this repository and is not published to npm.</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>npm run cli -- doctor</code>
            </pre>
            <Badge>Local package</Badge>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            Widget snippet
            <Button
              type="button"
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText(snippet)}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" aria-hidden="true" /> Copy
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  );
}
