import { describe, expect, it, vi } from "vitest";
import { aiAssetSchema, groupAssetsByType, isAssetVisibleToWorkspace } from "@/lib/aiAssets";
import { createCommandRegistry, searchCommands } from "@/lib/commandRegistry";
import { isIntegrationVisibleToWorkspace, mapIntegrationToHealth, integrationMetadataSchema } from "@/lib/integrations";
import { navigationGroups } from "@/lib/navigation";

describe("Product Pro navigation", () => {
  it("keeps the business-owner information architecture grouped", () => {
    const labels = navigationGroups.flatMap((group) => group.items.map((item) => item.label));

    expect(labels).toEqual(
      expect.arrayContaining([
        "Overview",
        "Leads",
        "Conversations",
        "AI Agent",
        "Knowledge",
        "Automations",
        "Analytics",
        "Integrations",
        "AI Assets",
        "Developer",
        "Settings",
      ])
    );
  });
});

describe("Product Pro command registry", () => {
  it("contains safe workspace commands without destructive actions", async () => {
    const navigate = vi.fn();
    const copyWidgetSnippet = vi.fn();
    const setTheme = vi.fn();
    const commands = createCommandRegistry({ navigate, copyWidgetSnippet, setTheme });

    expect(searchCommands(commands, "leads")[0].label).toBe("Go to Leads");
    await commands.find((command) => command.id === "widget:copy")?.run();
    expect(copyWidgetSnippet).toHaveBeenCalledOnce();
    expect(commands.some((command) => /delete|destroy|reset/i.test(command.label))).toBe(false);
  });
});

describe("Product Pro integration metadata", () => {
  it("validates provider metadata without browser-readable tokens", () => {
    const integration = integrationMetadataSchema.parse({
      id: "github",
      workspaceId: "ws_123",
      provider: "github",
      status: "not_configured",
    });

    expect(integration.provider).toBe("github");
    expect("token" in integration).toBe(false);
  });

  it("maps not configured providers separately from installed CLIs", () => {
    const health = mapIntegrationToHealth({
      id: "hf",
      workspaceId: "ws_123",
      provider: "huggingface",
      status: "not_configured",
    });

    expect(health.status).toBe("not_configured");
    expect(health.configured).toBe(false);
  });

  it("preserves tenant isolation for provider metadata", () => {
    const integration = integrationMetadataSchema.parse({
      id: "github",
      workspaceId: "ws_a",
      provider: "github",
      status: "not_configured",
    });

    expect(isIntegrationVisibleToWorkspace(integration, "ws_a")).toBe(true);
    expect(isIntegrationVisibleToWorkspace(integration, "ws_b")).toBe(false);
  });
});

describe("Product Pro AI assets", () => {
  it("stores metadata references only and preserves workspace isolation", () => {
    const asset = aiAssetSchema.parse({
      id: "asset_1",
      workspaceId: "ws_a",
      provider: "huggingface",
      type: "model",
      externalId: "lead-ai/example",
      title: "Example model reference",
      referenceUrl: "https://huggingface.co/lead-ai/example",
      status: "active",
      createdAt: "2026-08-10T00:00:00.000Z",
      updatedAt: "2026-08-10T00:00:00.000Z",
    });

    expect(isAssetVisibleToWorkspace(asset, "ws_a")).toBe(true);
    expect(isAssetVisibleToWorkspace(asset, "ws_b")).toBe(false);
  });

  it("groups AI asset metadata without mixing asset types", () => {
    const assets = [
      aiAssetSchema.parse({
        id: "asset_1",
        workspaceId: "ws_a",
        provider: "github",
        type: "repository",
        externalId: "lead-ai/repo",
        title: "Repository",
        status: "active",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
      }),
      aiAssetSchema.parse({
        id: "asset_2",
        workspaceId: "ws_a",
        provider: "kaggle",
        type: "notebook",
        externalId: "lead-ai/notebook",
        title: "Notebook",
        status: "active",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
      }),
    ];

    const groups = groupAssetsByType(assets);

    expect(groups.repository).toHaveLength(1);
    expect(groups.notebook).toHaveLength(1);
    expect(groups.model).toHaveLength(0);
  });
});
