import { Database, Github, Globe2, KeyRound, PlugZap } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { db } from "@/lib/firebase/client";
import { providerLabel, integrationStatusLabel, type IntegrationMetadata } from "@/lib/integrations";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

const providerCopy: Record<IntegrationMetadata["provider"], { purpose: string; icon: typeof Github }> = {
  firebase: { purpose: "Authentication, workspace data, Firestore rules, and tenant-scoped records.", icon: Database },
  github: { purpose: "Repository and CI visibility for engineering workflows.", icon: Github },
  huggingface: { purpose: "Model, dataset, and Space references for AI asset management.", icon: PlugZap },
  kaggle: { purpose: "Dataset and notebook references for data experimentation.", icon: PlugZap },
  openai: { purpose: "Server-side AI orchestration for chat responses and summaries.", icon: KeyRound },
  website_widget: { purpose: "Allowed origins and widget installation for website chat.", icon: Globe2 },
};

export default function Integrations() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  const integrations: IntegrationMetadata[] = [
    {
      id: "firebase-client",
      workspaceId: workspace.id,
      provider: "firebase",
      status: db ? "connected" : "configuration_required",
    },
    {
      id: "openai-server",
      workspaceId: workspace.id,
      provider: "openai",
      status: "unknown",
    },
    {
      id: "website-widget",
      workspaceId: workspace.id,
      provider: "website_widget",
      status: workspace.allowedOrigins.length ? "connected" : "configuration_required",
    },
    { id: "github", workspaceId: workspace.id, provider: "github", status: "not_configured" },
    { id: "huggingface", workspaceId: workspace.id, provider: "huggingface", status: "not_configured" },
    { id: "kaggle", workspaceId: workspace.id, provider: "kaggle", status: "not_configured" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Integrations"
        description="Provider status distinguishes architecture readiness from real authorization. External provider tokens are never browser-readable."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = providerCopy[integration.provider].icon;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {providerLabel(integration.provider)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{providerCopy[integration.provider].purpose}</p>
                <Badge tone={toneForStatus(integration.status)}>{integrationStatusLabel(integration.status)}</Badge>
                <div>
                  <Button type="button" variant="secondary" disabled>
                    Connect flow not configured
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function toneForStatus(status: IntegrationMetadata["status"]): "neutral" | "warning" | "success" | "danger" {
  if (status === "connected") return "success";
  if (status === "needs_attention") return "danger";
  if (status === "configuration_required") return "warning";
  return "neutral";
}
