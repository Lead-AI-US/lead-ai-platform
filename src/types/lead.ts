import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type LeadStatus = "new" | "reviewed" | "contacted" | "qualified" | "not_ready" | "closed";
export type LeadSource = "website_chat" | "manual";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "reviewed",
  "contacted",
  "qualified",
  "not_ready",
  "closed",
];

/** Firestore path: workspaces/{workspaceId}/leads/{leadId} */
export interface Lead {
  id: string;
  workspaceId: string;
  source: LeadSource;

  name?: string;
  email?: string;
  phone?: string;
  message?: string;

  status: LeadStatus;
  conversationId?: string;

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
