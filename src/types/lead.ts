import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type LeadStatus = "new" | "reviewed" | "contacted" | "qualified" | "not_ready" | "closed";
export type LeadSource = "website_chat" | "manual";
export type LeadStage = "new" | "qualified" | "contacted" | "booked" | "won" | "lost";

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
  customerId?: string;

  name?: string;
  email?: string;
  phone?: string;
  message?: string;

  status: LeadStatus;
  stage?: LeadStage;
  conversationId?: string;
  intent?: string;
  qualification?: {
    score?: number;
    confidence?: number;
    reasons?: string[];
  };
  assignedTo?: string;
  nextAction?: string;
  nextActionAt?: IsoTimestamp;

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
