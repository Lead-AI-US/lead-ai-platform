import type { IsoTimestamp } from "./firestoreTimestamp";

/** Firestore path: users/{uid} */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
