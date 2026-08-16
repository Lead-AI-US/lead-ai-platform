import type { Automation } from "@/types/automation.js";
import type { BusinessEvent } from "@/types/event.js";

export function automationMatchesTrigger(automation: Automation, event: BusinessEvent): boolean {
  return automation.enabled && automation.workspaceId === event.workspaceId && automation.trigger.type === event.type;
}
