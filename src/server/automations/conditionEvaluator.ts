import type { AutomationCondition } from "@/types/automation.js";
import type { BusinessEvent } from "@/types/event.js";

export function evaluateAutomationConditions(conditions: AutomationCondition[], event: BusinessEvent): boolean {
  return conditions.every((condition) => evaluateCondition(condition, event));
}

export function evaluateCondition(condition: AutomationCondition, event: BusinessEvent): boolean {
  const actual = valueForField(condition.field, event);
  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not_equals":
      return actual !== condition.value;
    case "contains":
      return typeof actual === "string" && typeof condition.value === "string" && actual.includes(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual as string | number | boolean);
    case "greater_than":
      return typeof actual === "number" && typeof condition.value === "number" && actual > condition.value;
    case "less_than":
      return typeof actual === "number" && typeof condition.value === "number" && actual < condition.value;
    case "exists":
      return actual !== undefined && actual !== null;
  }
}

function valueForField(field: AutomationCondition["field"], event: BusinessEvent): string | number | boolean | null | undefined {
  if (field === "intent") return event.metadata.intent;
  if (field === "leadStatus") return event.metadata.leadStatus ?? event.metadata.status;
  if (field === "qualificationScore") return event.metadata.confidence;
  if (field === "channel") return event.source.channel ?? event.metadata.channel;
  if (field === "status") return event.metadata.status;
}
