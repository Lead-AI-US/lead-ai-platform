import { describe, expect, it } from "vitest";
import { redactConfig, runDoctor } from "./leadai.mjs";

describe("leadai CLI", () => {
  it("redacts secret-shaped config fields", () => {
    expect(
      redactConfig({
        workspaceId: "ws_123",
        githubToken: "ghp_secret",
        nested: { OPENAI_API_KEY: "sk-secret", visible: "ok" },
      })
    ).toEqual({
      workspaceId: "ws_123",
      githubToken: "[redacted]",
      nested: { OPENAI_API_KEY: "[redacted]", visible: "ok" },
    });
  });

  it("never prints OpenAI secret values in doctor output", () => {
    process.env.OPENAI_API_KEY = "sk-should-not-print";
    const output = runDoctor();
    expect(output).toContain("Lead.AI Doctor");
    expect(output).toContain("OpenAI");
    expect(output).not.toContain("sk-should-not-print");
  });
});
