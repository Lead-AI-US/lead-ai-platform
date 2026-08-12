import { describe, expect, it } from "vitest";
import { automationMatchesTrigger } from "./triggerMatcher";
import { evaluateAutomationConditions } from "./conditionEvaluator";
import { shouldRetryAutomation } from "./automationRetry";
import type { Automation } from "@/types/automation";
import type { BusinessEvent } from "@/types/event";

const automation: Automation = {
  id: "auto_1",
  workspaceId: "ws_1",
  name: "Knowledge gap alert",
  enabled: true,
  trigger: { type: "knowledge_missing" },
  conditions: [{ field: "intent", operator: "equals", value: "faq" }],
  actions: [{ type: "create_internal_note", config: { note: "Review knowledge gap" } }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const event: BusinessEvent = {
  id: "event_1",
  workspaceId: "ws_1",
  type: "knowledge_missing",
  actor: { type: "ai" },
  source: { channel: "website" },
  metadata: { intent: "faq" },
  occurredAt: "2026-01-01T00:00:00.000Z",
};

describe("automation runtime primitives", () => {
  it("matches enabled automations by workspace and trigger", () => {
    expect(automationMatchesTrigger(automation, event)).toBe(true);
    expect(automationMatchesTrigger({ ...automation, workspaceId: "ws_2" }, event)).toBe(false);
  });

  it("evaluates safe typed conditions", () => {
    expect(evaluateAutomationConditions(automation.conditions, event)).toBe(true);
    expect(evaluateAutomationConditions([{ field: "intent", operator: "not_equals", value: "faq" }], event)).toBe(false);
  });

  it("does not retry policy or approval failures", () => {
    expect(shouldRetryAutomation("ACTION_APPROVAL_REQUIRED", 0)).toBe(false);
    expect(shouldRetryAutomation("AUTOMATION_EXECUTION_FAILED", 0)).toBe(true);
    expect(shouldRetryAutomation("AUTOMATION_EXECUTION_FAILED", 2)).toBe(false);
  });
});
