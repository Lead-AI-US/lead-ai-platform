import { z } from "zod";

export const integrationProviderSchema = z.enum([
  "github",
  "huggingface",
  "kaggle",
  "openai",
  "firebase",
  "website_widget",
]);

export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;

export const integrationStatusSchema = z.enum([
  "connected",
  "not_configured",
  "configuration_required",
  "needs_attention",
  "unknown",
]);

export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;

export const integrationMetadataSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  provider: integrationProviderSchema,
  status: integrationStatusSchema,
  accountLabel: z.string().optional(),
  lastCheckedAt: z.string().optional(),
  configuration: z
    .object({
      organization: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
});

export type IntegrationMetadata = z.infer<typeof integrationMetadataSchema>;

export interface ProviderHealth {
  provider: IntegrationProvider;
  configured: boolean;
  reachable?: boolean;
  status: "healthy" | "warning" | "error" | "not_configured" | "unknown";
  checkedAt?: string;
  accountLabel?: string;
  nextAction?: string;
}

export interface ProviderDefinition {
  provider: IntegrationProvider;
  label: string;
  purpose: string;
  assetTypes: Array<"repository" | "model" | "dataset" | "space" | "notebook">;
  serverOnly: boolean;
}

export const EXTERNAL_PROVIDER_IDS = ["github", "huggingface", "kaggle"] as const;

export type ExternalProvider = (typeof EXTERNAL_PROVIDER_IDS)[number];

export const providerDefinitions: ProviderDefinition[] = [
  {
    provider: "firebase",
    label: "Firebase",
    purpose: "Authentication, workspace data, Firestore rules, and tenant-scoped records.",
    assetTypes: [],
    serverOnly: true,
  },
  {
    provider: "openai",
    label: "OpenAI",
    purpose: "Server-side AI orchestration for chat responses and summaries.",
    assetTypes: [],
    serverOnly: true,
  },
  {
    provider: "website_widget",
    label: "Website Widget",
    purpose: "Allowed origins and widget installation for website chat.",
    assetTypes: [],
    serverOnly: false,
  },
  {
    provider: "github",
    label: "GitHub",
    purpose: "Read-only repository and CI metadata for engineering workflows.",
    assetTypes: ["repository"],
    serverOnly: true,
  },
  {
    provider: "huggingface",
    label: "Hugging Face",
    purpose: "Read-only model, dataset, and Space metadata for AI asset management.",
    assetTypes: ["model", "dataset", "space"],
    serverOnly: true,
  },
  {
    provider: "kaggle",
    label: "Kaggle",
    purpose: "Read-only dataset and notebook metadata for data experimentation.",
    assetTypes: ["dataset", "notebook"],
    serverOnly: true,
  },
];

export function providerDefinition(provider: IntegrationProvider): ProviderDefinition {
  return providerDefinitions.find((definition) => definition.provider === provider)!;
}

export function mapIntegrationToHealth(integration: IntegrationMetadata): ProviderHealth {
  if (integration.status === "connected") {
    return {
      provider: integration.provider,
      configured: true,
      reachable: true,
      status: "healthy",
      checkedAt: integration.lastCheckedAt,
      accountLabel: integration.accountLabel,
      nextAction: "Manage connection",
    };
  }

  if (integration.status === "needs_attention") {
    return {
      provider: integration.provider,
      configured: true,
      reachable: false,
      status: "error",
      checkedAt: integration.lastCheckedAt,
      accountLabel: integration.accountLabel,
      nextAction: "Review server-side provider configuration",
    };
  }

  if (integration.status === "configuration_required") {
    return {
      provider: integration.provider,
      configured: false,
      status: "warning",
      checkedAt: integration.lastCheckedAt,
      accountLabel: integration.accountLabel,
      nextAction: "Finish required workspace configuration",
    };
  }

  if (integration.status === "not_configured") {
    return {
      provider: integration.provider,
      configured: false,
      status: "not_configured",
      checkedAt: integration.lastCheckedAt,
      accountLabel: integration.accountLabel,
      nextAction: "Configure a server-side provider connection",
    };
  }

  return {
    provider: integration.provider,
    configured: false,
    status: "unknown",
    checkedAt: integration.lastCheckedAt,
    accountLabel: integration.accountLabel,
    nextAction: "Verify provider health",
  };
}

export function providerLabel(provider: IntegrationProvider): string {
  return providerDefinition(provider).label;
}

export function integrationStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    connected: "Connected",
    configuration_required: "Configuration Required",
    needs_attention: "Needs Attention",
    not_configured: "Not Configured",
    unknown: "Unknown",
  };

  return labels[status];
}

export function createDefaultProviderIntegrations(
  workspaceId: string,
  runtime: {
    firebaseConfigured: boolean;
    openaiStatus?: IntegrationStatus;
    allowedOrigins: string[];
  }
): IntegrationMetadata[] {
  return [
    {
      id: `${workspaceId}:firebase`,
      workspaceId,
      provider: "firebase",
      status: runtime.firebaseConfigured ? "connected" : "configuration_required",
      accountLabel: runtime.firebaseConfigured ? "Client project configured" : undefined,
    },
    {
      id: `${workspaceId}:openai`,
      workspaceId,
      provider: "openai",
      status: runtime.openaiStatus ?? "unknown",
      accountLabel: runtime.openaiStatus === "connected" ? "Server adapter configured" : undefined,
    },
    {
      id: `${workspaceId}:website-widget`,
      workspaceId,
      provider: "website_widget",
      status: runtime.allowedOrigins.length ? "connected" : "configuration_required",
      accountLabel: runtime.allowedOrigins.length ? `${runtime.allowedOrigins.length} allowed origin(s)` : undefined,
    },
    ...EXTERNAL_PROVIDER_IDS.map((provider) => ({
      id: `${workspaceId}:${provider}`,
      workspaceId,
      provider,
      status: "not_configured" as const,
    })),
  ];
}

export function isIntegrationVisibleToWorkspace(integration: IntegrationMetadata, workspaceId: string): boolean {
  return integration.workspaceId === workspaceId;
}
