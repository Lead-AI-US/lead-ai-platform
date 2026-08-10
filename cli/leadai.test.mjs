import { describe, expect, it } from "vitest";
import { detectProviders, redactConfig, redactText, runAssets, runDoctor, runIntegrations } from "./leadai.mjs";

describe("leadai CLI", () => {
  it("redacts secret-shaped config fields", () => {
    expect(
      redactConfig({
        workspaceId: "ws_123",
        githubToken: "ghp_secret",
        nested: { OPENAI_API_KEY: "sk-secret", visible: "ok" },
        headers: { Authorization: "Bearer secret-token" },
        kaggle: { username: "lead-ai", key: "kaggle-secret" },
      })
    ).toEqual({
      workspaceId: "ws_123",
      githubToken: "[redacted]",
      nested: { OPENAI_API_KEY: "[redacted]", visible: "ok" },
      headers: { Authorization: "[redacted]" },
      kaggle: { username: "lead-ai", key: "[redacted]" },
    });
  });

  it("redacts common token text formats", () => {
    const output = redactText(
      "OPENAI_API_KEY=sk-shouldnotprint GITHUB_TOKEN=ghp_shouldnotprint HF_TOKEN=hf_shouldnotprint Authorization: Bearer abc.def"
    );

    expect(output).not.toContain("sk-shouldnotprint");
    expect(output).not.toContain("ghp_shouldnotprint");
    expect(output).not.toContain("hf_shouldnotprint");
    expect(output).not.toContain("abc.def");
  });

  it("never prints OpenAI secret values in doctor output", () => {
    process.env.OPENAI_API_KEY = "sk-should-not-print";
    const output = runDoctor({ checkAuth: false });
    expect(output).toContain("Lead.AI Doctor");
    expect(output).toContain("OpenAI");
    expect(output).not.toContain("sk-should-not-print");
  });

  it("distinguishes local authentication from product workspace connection", () => {
    const providers = detectProviders({ checkAuth: false });
    expect(providers.map((provider) => provider.productConnection)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured",
    ]);
  });

  it("supports json output for doctor, integrations, and assets", () => {
    expect(JSON.parse(runDoctor({ json: true, checkAuth: false }))).toHaveProperty("providers");
    expect(JSON.parse(runIntegrations({ json: true, checkAuth: false }))).toHaveProperty("providers");
    expect(JSON.parse(runAssets({ json: true }))).toEqual({ assets: [] });
  });
});
