import type { IsoTimestamp } from "./firestoreTimestamp.js";

/** Firestore path: workspaces/{workspaceId}/customers/{customerId} */
export interface Customer {
  id: string;
  workspaceId: string;

  displayName?: string;
  email?: string;
  phone?: string;

  source?: string;
  preferredChannel?: string;
  tags: string[];

  firstSeenAt: IsoTimestamp;
  lastSeenAt: IsoTimestamp;

  conversationCount: number;
  leadCount: number;

  latestIntent?: string;
  latestOutcome?: string;

  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
