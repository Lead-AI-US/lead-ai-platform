import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import type { KnowledgeSource } from "@/types/knowledge";

const wsA: KnowledgeSource = {
  id: "ks_a",
  workspaceId: "ws_a",
  title: "A's hours",
  content: "Workspace A is open 9-5.",
  status: "approved",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "owner_a",
};

describe("buildSystemPrompt — tenant grounding", () => {
  it("embeds the given business name and only the given knowledge", () => {
    const prompt = buildSystemPrompt({ businessName: "Acme Dental", knowledge: [wsA] });
    expect(prompt).toContain("Acme Dental");
    expect(prompt).toContain("Workspace A is open 9-5.");
  });

  it("never invents knowledge — an empty knowledge list is explicitly stated as empty", () => {
    const prompt = buildSystemPrompt({ businessName: "Acme Dental", knowledge: [] });
    expect(prompt).toContain("no approved knowledge configured yet");
  });

  it("instructs the model to represent the business, not Lead.AI", () => {
    const prompt = buildSystemPrompt({ businessName: "Acme Dental", knowledge: [] });
    expect(prompt).toMatch(/represent this business, not Lead\.AI/);
  });

  it("instructs the model never to invent business facts", () => {
    const prompt = buildSystemPrompt({ businessName: "Acme Dental", knowledge: [] });
    expect(prompt.toLowerCase()).toContain("never invent");
  });
});
