import { describe, expect, it } from "vitest";
import {
  githubProviderAdapter,
  huggingFaceProviderAdapter,
  kaggleProviderAdapter,
  providerAdapters,
} from "./providerAdapters";

const fixedNow = () => new Date("2026-08-10T00:00:00.000Z");

describe("provider adapter contracts", () => {
  it("distinguishes unconfigured GitHub from authenticated server credentials without exposing tokens", async () => {
    const empty = await githubProviderAdapter.readAccount({ workspaceId: "ws_a", env: {}, now: fixedNow });
    const configured = await githubProviderAdapter.readAccount({
      workspaceId: "ws_a",
      env: { GITHUB_TOKEN: "ghp_secret", GITHUB_OWNER: "lead-ai" },
      now: fixedNow,
    });

    expect(empty.status).toBe("not_configured");
    expect(configured.status).toBe("authenticated");
    expect(JSON.stringify(configured)).not.toContain("ghp_secret");
  });

  it("supports Hugging Face and Kaggle configuration checks without network calls", async () => {
    await expect(
      huggingFaceProviderAdapter.readAccount({
        workspaceId: "ws_a",
        env: { HF_TOKEN: "hf_secret", HF_USERNAME: "lead-ai" },
        now: fixedNow,
      })
    ).resolves.toMatchObject({ provider: "huggingface", status: "authenticated", accountLabel: "lead-ai" });

    await expect(
      kaggleProviderAdapter.readAccount({
        workspaceId: "ws_a",
        env: { KAGGLE_USERNAME: "lead-ai", KAGGLE_KEY: "kaggle_secret" },
        now: fixedNow,
      })
    ).resolves.toMatchObject({ provider: "kaggle", status: "authenticated", accountLabel: "lead-ai" });
  });

  it("keeps the adapter registry limited to external read-only providers", () => {
    expect(Object.keys(providerAdapters).sort()).toEqual(["github", "huggingface", "kaggle"]);
  });
});

