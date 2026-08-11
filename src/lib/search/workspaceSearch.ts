import type { Conversation } from "@/types/conversation";
import type { Customer } from "@/types/customer";
import type { KnowledgeSource } from "@/types/knowledge";
import type { Lead } from "@/types/lead";

export type WorkspaceSearchType = "customer" | "lead" | "conversation" | "knowledge";

export interface WorkspaceSearchResult {
  type: WorkspaceSearchType;
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  destination: string;
}

export function buildWorkspaceSearchIndex(params: {
  customers?: Customer[];
  leads?: Lead[];
  conversations?: Conversation[];
  knowledge?: KnowledgeSource[];
}): WorkspaceSearchResult[] {
  return [
    ...(params.customers ?? []).map((customer): WorkspaceSearchResult => ({
      type: "customer",
      id: customer.id,
      title: customer.displayName || customer.email || customer.phone || `Customer ${customer.id.slice(-6)}`,
      subtitle: customer.latestIntent ?? customer.source ?? "Customer",
      updatedAt: customer.updatedAt,
      destination: `/app/customers/${customer.id}`,
    })),
    ...(params.leads ?? []).map((lead): WorkspaceSearchResult => ({
      type: "lead",
      id: lead.id,
      title: lead.name || lead.email || lead.phone || `Lead ${lead.id.slice(-6)}`,
      subtitle: lead.intent ?? lead.status,
      updatedAt: lead.updatedAt,
      destination: "/app/leads",
    })),
    ...(params.conversations ?? []).map((conversation): WorkspaceSearchResult => ({
      type: "conversation",
      id: conversation.id,
      title: conversation.customerId ? `Conversation ${conversation.customerId.slice(-6)}` : `Conversation ${conversation.id.slice(-6)}`,
      subtitle: conversation.latestIntent ?? conversation.status,
      updatedAt: conversation.updatedAt,
      destination: "/app/inbox",
    })),
    ...(params.knowledge ?? []).map((item): WorkspaceSearchResult => ({
      type: "knowledge",
      id: item.id,
      title: item.title,
      subtitle: item.status,
      updatedAt: item.updatedAt,
      destination: "/app/knowledge",
    })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function filterWorkspaceSearch(results: WorkspaceSearchResult[], query: string): WorkspaceSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return results;
  return results.filter((result) =>
    [result.type, result.title, result.subtitle].join(" ").toLowerCase().includes(normalized)
  );
}
