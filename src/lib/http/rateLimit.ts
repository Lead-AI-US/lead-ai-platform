/**
 * Durable, minimal fixed-window rate limiter backed by Firestore, since
 * serverless functions don't share in-memory state between invocations. Not
 * a general-purpose rate limiter - just enough to keep the public chat API
 * from being trivially hammered.
 *
 * Path: workspaces/{workspaceId}/rateLimits/{windowKey}
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT_PER_WINDOW = 20;

function windowKey(now: number, bucket: string): string {
  return `${bucket}_${Math.floor(now / WINDOW_MS)}`;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * `bucket` should scope the limit to something meaningful (e.g.
 * `${workspaceId}:${visitorSessionId}`). Fails OPEN (allowed: true) if the
 * database isn't configured - a missing rate limiter must not take the
 * whole chat feature down, though this should be paired with the
 * per-request payload/size limits that don't depend on Firestore.
 */
export async function checkRateLimit(
  workspaceId: string,
  bucket: string,
  limit: number = DEFAULT_LIMIT_PER_WINDOW
): Promise<RateLimitResult> {
  const db = getAdminDb();
  if (!db) return { allowed: true, remaining: limit };

  const key = windowKey(Date.now(), bucket);
  const ref = db.collection("workspaces").doc(workspaceId).collection("rateLimits").doc(key);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const current = (doc.data()?.count as number | undefined) ?? 0;
      if (current >= limit) {
        return { allowed: false, remaining: 0 };
      }
      tx.set(ref, { count: FieldValue.increment(1), updatedAt: new Date().toISOString() }, { merge: true });
      return { allowed: true, remaining: limit - current - 1 };
    });
    return result;
  } catch (error) {
    console.warn("[rateLimit] check failed, failing open", error);
    return { allowed: true, remaining: limit };
  }
}
