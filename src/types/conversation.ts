import type { IsoTimestamp } from "./firestoreTimestamp.js";

export type ConversationStatus = "active" | "needs_human" | "resolved";
export type ConversationChannel = "website";

/** Firestore path: workspaces/{workspaceId}/conversations/{conversationId} */
export interface Conversation {
  id: string;
  workspaceId: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  visitorSessionId: string;
  customerId?: string;
  leadId?: string;
  latestIntent?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type MessageRole = "visitor" | "assistant" | "human" | "system";

/** Firestore path: workspaces/{workspaceId}/conversations/{conversationId}/messages/{messageId} */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: IsoTimestamp;
}

/** Hard cap enforced both client-side (UX) and server-side (security). */
export const MAX_MESSAGE_LENGTH = 2000;
