import { EXTERNAL_PROVIDER_IDS, providerLabel, type ExternalProvider } from "../../src/lib/integrations";

export type ProviderAuthState = "authenticated" | "not_configured" | "error";

export interface ProviderAdapterContext {
  workspaceId: string;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}

export interface ProviderAccount {
  provider: ExternalProvider;
  status: ProviderAuthState;
  accountLabel?: string;
  checkedAt: string;
  details?: string;
}

export interface ProviderAdapter {
  provider: ExternalProvider;
  readAccount(context: ProviderAdapterContext): Promise<ProviderAccount>;
}

function isoNow(context: ProviderAdapterContext) {
  return (context.now?.() ?? new Date()).toISOString();
}

function envHas(env: NodeJS.ProcessEnv | undefined, ...names: string[]) {
  return names.some((name) => Boolean(env?.[name]));
}

function configuredAccount(provider: ExternalProvider, context: ProviderAdapterContext, accountLabel?: string): ProviderAccount {
  return {
    provider,
    status: "authenticated",
    accountLabel: accountLabel ?? `${providerLabel(provider)} server credential configured`,
    checkedAt: isoNow(context),
  };
}

function notConfigured(provider: ExternalProvider, context: ProviderAdapterContext, details: string): ProviderAccount {
  return {
    provider,
    status: "not_configured",
    checkedAt: isoNow(context),
    details,
  };
}

export const githubProviderAdapter: ProviderAdapter = {
  provider: "github",
  async readAccount(context) {
    const env = context.env ?? process.env;
    if (!envHas(env, "GITHUB_TOKEN", "GH_TOKEN")) {
      return notConfigured("github", context, "Set a server-side GitHub token before enabling workspace sync.");
    }

    return configuredAccount("github", context, env.GITHUB_OWNER ?? env.GITHUB_REPOSITORY_OWNER);
  },
};

export const huggingFaceProviderAdapter: ProviderAdapter = {
  provider: "huggingface",
  async readAccount(context) {
    const env = context.env ?? process.env;
    if (!envHas(env, "HF_TOKEN", "HUGGINGFACE_TOKEN")) {
      return notConfigured("huggingface", context, "Set a server-side Hugging Face token before enabling workspace sync.");
    }

    return configuredAccount("huggingface", context, env.HF_USERNAME ?? env.HUGGINGFACE_USERNAME);
  },
};

export const kaggleProviderAdapter: ProviderAdapter = {
  provider: "kaggle",
  async readAccount(context) {
    const env = context.env ?? process.env;
    if (!envHas(env, "KAGGLE_USERNAME") || !envHas(env, "KAGGLE_KEY")) {
      return notConfigured("kaggle", context, "Set KAGGLE_USERNAME and KAGGLE_KEY on the server before enabling workspace sync.");
    }

    return configuredAccount("kaggle", context, env.KAGGLE_USERNAME);
  },
};

export const providerAdapters: Record<ExternalProvider, ProviderAdapter> = {
  github: githubProviderAdapter,
  huggingface: huggingFaceProviderAdapter,
  kaggle: kaggleProviderAdapter,
};

export function assertKnownProvider(provider: string): asserts provider is ExternalProvider {
  if (!EXTERNAL_PROVIDER_IDS.includes(provider as ExternalProvider)) {
    throw new Error("unknown_provider");
  }
}

