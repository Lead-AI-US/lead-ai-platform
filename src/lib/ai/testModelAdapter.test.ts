import { afterEach, describe, expect, it } from "vitest";
import { buildTestDecision, isE2EFakeModelSafeToUse, resolveTestModelOverride } from "./testModelAdapter";
import type { KnowledgeSource } from "../../types/knowledge";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const KNOWLEDGE: KnowledgeSource[] = [
  {
    id: "ks1",
    workspaceId: "ws_1",
    title: "Hours",
    content: "We're open Monday to Friday, 9am to 5pm.",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "owner_1",
  },
];

describe("isE2EFakeModelSafeToUse — the actual security boundary", () => {
  it("is false by default (flag unset)", () => {
    delete process.env.LEAD_AI_E2E_FAKE_MODEL;
    expect(isE2EFakeModelSafeToUse()).toBe(false);
  });

  it("is true only when the flag is set and nothing looks like production", () => {
    process.env.LEAD_AI_E2E_FAKE_MODEL = "true";
    delete process.env.NODE_ENV;
    delete process.env.VERCEL_ENV;
    expect(isE2EFakeModelSafeToUse()).toBe(true);
  });

  it("is false when the flag is set but NODE_ENV=production, no override possible", () => {
    process.env.LEAD_AI_E2E_FAKE_MODEL = "true";
    process.env.NODE_ENV = "production";
    expect(isE2EFakeModelSafeToUse()).toBe(false);
  });

  it("is false when the flag is set but VERCEL_ENV=production, no override possible", () => {
    process.env.LEAD_AI_E2E_FAKE_MODEL = "true";
    process.env.VERCEL_ENV = "production";
    expect(isE2EFakeModelSafeToUse()).toBe(false);
  });

  it("resolveTestModelOverride returns undefined (real model path) when not safe", () => {
    delete process.env.LEAD_AI_E2E_FAKE_MODEL;
    expect(resolveTestModelOverride(KNOWLEDGE)).toBeUndefined();
  });
});

describe("buildTestDecision — deterministic scenario coverage", () => {
  it("booking message with collected fields produces a lead-capture decision", () => {
    const decision = buildTestDecision(
      "I'd like to book an appointment. name: Jamie Test email: jamie@example.com phone: 555-0100",
      KNOWLEDGE
    );
    expect(decision.shouldCreateLead).toBe(true);
    expect(decision.collectedFields).toEqual({
      name: "Jamie Test",
      email: "jamie@example.com",
      phone: "555-0100",
    });
  });

  it("explicit human request produces a handoff decision", () => {
    const decision = buildTestDecision("I want to speak to a human", KNOWLEDGE);
    expect(decision.shouldRequestHandoff).toBe(true);
    expect(decision.shouldCreateLead).toBe(false);
  });

  it("hours question answers from approved knowledge verbatim", () => {
    const decision = buildTestDecision("What are your hours?", KNOWLEDGE);
    expect(decision.intent).toBe("faq");
    expect(decision.response).toBe(KNOWLEDGE[0].content);
  });

  it("unmatched question falls back to an honest unsupported + handoff decision", () => {
    const decision = buildTestDecision("Do you offer rocket ship maintenance?", KNOWLEDGE);
    expect(decision.intent).toBe("unsupported");
    expect(decision.shouldRequestHandoff).toBe(true);
    expect(decision.shouldCreateLead).toBe(false);
  });
});
