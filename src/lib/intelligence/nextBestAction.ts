import type { BusinessEvent } from "@/types/event";
import type { Lead } from "@/types/lead";

export interface NextBestAction {
  id: string;
  label: string;
  description: string;
  destination: string;
  priority: "high" | "medium" | "low";
}

export function deriveNextBestActions(params: {
  leads: Lead[];
  events: BusinessEvent[];
  approvedKnowledgeCount: number;
}): NextBestAction[] {
  const actions: NextBestAction[] = [];

  const qualifiedWithoutAction = params.leads.find((lead) => lead.status === "qualified" && !lead.nextAction);
  if (qualifiedWithoutAction) {
    actions.push({
      id: `lead-followup:${qualifiedWithoutAction.id}`,
      label: "Schedule follow-up",
      description: "A qualified lead has no next action assigned.",
      destination: "/app/leads",
      priority: "high",
    });
  }

  const handoff = params.events.find((event) => event.type === "human_handoff_requested");
  if (handoff) {
    actions.push({
      id: `handoff:${handoff.id}`,
      label: "Respond to handoff",
      description: "A customer conversation is waiting for a human response.",
      destination: "/app/inbox",
      priority: "high",
    });
  }

  const knowledgeGap = params.events.find((event) => event.type === "knowledge_missing");
  if (knowledgeGap || params.approvedKnowledgeCount === 0) {
    actions.push({
      id: knowledgeGap ? `knowledge-gap:${knowledgeGap.id}` : "knowledge:add-approved",
      label: "Improve knowledge",
      description: knowledgeGap ? "Customers asked something the AI could not answer." : "No approved knowledge is available.",
      destination: "/app/knowledge",
      priority: "medium",
    });
  }

  return actions;
}
