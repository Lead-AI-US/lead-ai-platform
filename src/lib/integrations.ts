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
}

export function mapIntegrationToHealth(integration: IntegrationMetadata): ProviderHealth {
  if (integration.status === "connected") {
    return {
      provider: integration.provider,
      configured: true,
      reachable: true,
      status: "healthy",
      checkedAt: integration.lastCheckedAt,
    };
  }

  if (integration.status === "needs_attention") {
    return {
      provider: integration.provider,
      configured: true,
      reachable: false,
      status: "error",
      checkedAt: integration.lastCheckedAt,
    };
  }

  if (integration.status === "configuration_required") {
    return {
      provider: integration.provider,
      configured: false,
      status: "warning",
      checkedAt: integration.lastCheckedAt,
    };
  }

  if (integration.status === "not_configured") {
    return {
      provider: integration.provider,
      configured: false,
      status: "not_configured",
      checkedAt: integration.lastCheckedAt,
    };
  }

  return {
    provider: integration.provider,
    configured: false,
    status: "unknown",
    checkedAt: integration.lastCheckedAt,
  };
}

export function providerLabel(provider: IntegrationProvider): string {
  const labels: Record<IntegrationProvider, string> = {
    firebase: "Firebase",
    github: "GitHub",
    huggingface: "Hugging Face",
    kaggle: "Kaggle",
    openai: "OpenAI",
    website_widget: "Website Widget",
  };

  return labels[provider];
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
