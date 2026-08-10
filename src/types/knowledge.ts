import type { IsoTimestamp } from "./firestoreTimestamp";

export type KnowledgeStatus = "draft" | "approved" | "archived";

/** Firestore path: workspaces/{workspaceId}/knowledgeSources/{sourceId} */
export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  status: KnowledgeStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: IsoTimestamp;
}
