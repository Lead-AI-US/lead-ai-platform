import { Database, Github, Globe2, KeyRound, PlugZap } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { db } from "@/lib/firebase/client";
import {
  createDefaultProviderIntegrations,
  integrationStatusLabel,
  mapIntegrationToHealth,
  providerDefinition,
  providerLabel,
  type IntegrationMetadata,
} from "@/lib/integrations";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

const providerCopy: Record<IntegrationMetadata["provider"], { icon: typeof Github }> = {
  firebase: { icon: Database },
  github: { icon: Github },
  huggingface: { icon: PlugZap },
  kaggle: { icon: PlugZap },
  openai: { icon: KeyRound },
  website_widget: { icon: Globe2 },
};

export default function Integrations() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  const integrations = createDefaultProviderIntegrations(workspace.id, {
    firebaseConfigured: Boolean(db),
    allowedOrigins: workspace.allowedOrigins,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Integrations"
        description="Provider status distinguishes architecture readiness from real authorization. External provider tokens are never browser-readable."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const health = mapIntegrationToHealth(integration);
          const definition = providerDefinition(integration.provider);
          const Icon = providerCopy[integration.provider].icon;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {providerLabel(integration.provider)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{definition.purpose}</p>
                <dl className="grid gap-3 text-sm">
                  <Detail label="What it is" value={definition.assetTypes.length ? definition.assetTypes.join(", ") : "Platform service"} />
                  <Detail label="Connected" value={integrationStatusLabel(integration.status)} tone={toneForStatus(integration.status)} />
                  <Detail label="Account" value={integration.accountLabel ?? "Not connected"} />
                  <Detail label="Last verified" value={integration.lastCheckedAt ?? "Not checked"} />
                  <Detail label="Next action" value={health.nextAction ?? "Verify provider health"} />
                </dl>
                <Button type="button" variant="secondary" disabled={integration.status !== "connected"}>
                  {integration.status === "connected" ? "Manage connection" : "Connect flow not configured"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
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
  tone?: "neutral" | "warning" | "success" | "danger";
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{tone ? <Badge tone={tone}>{value}</Badge> : value}</dd>
    </div>
  );
}

function toneForStatus(status: IntegrationMetadata["status"]): "neutral" | "warning" | "success" | "danger" {
  if (status === "connected") return "success";
  if (status === "needs_attention") return "danger";
  if (status === "configuration_required") return "warning";
  return "neutral";
}
