/**
 * Product analytics — SERVER ONLY. Privacy-first, fail-safe, fail-closed.
 *
 * 1. FAIL CLOSED on missing workspaceId — never silently attribute an event
 *    to the wrong workspace or a platform-wide bucket.
 * 2. PROPERTY ALLOW-LISTING — only known-safe metadata keys are stored.
 *    Full messages, emails, phone numbers, and API responses are never
 *    written to analyticsEvents, even if passed in.
 * 3. FAIL-SAFE — a tracking failure must never break the business action
 *    that triggered it (a chat reply, a lead creation).
 */
import { getAdminDb } from "../firebase/admin.js";
import type { AnalyticsEvent, AnalyticsEventName, ActorType } from "../../types/analytics.js";

const ALLOWED_PROP_KEYS = new Set([
  "source",
  "intent",
  "status",
  "channel",
  "durationMs",
  "reason",
  "count",
]);

/** Exported for direct unit testing — see src/lib/analytics/track.test.ts. */
export function filterProperties(
  props?: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  if (!props) return {};
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      clean[key] = value as string | number | boolean | null;
    }
  }
  return clean;
}

export async function trackEvent(params: {
  workspaceId: string;
  eventName: AnalyticsEventName;
  actorType: ActorType;
  actorId?: string;
  properties?: Record<string, unknown>;
  isTest?: boolean;
}): Promise<AnalyticsEvent | null> {
  if (!params.workspaceId || !params.workspaceId.trim()) {
    console.warn("[analytics] rejected event with no workspaceId");
    return null;
  }

  const db = getAdminDb();
  if (!db) {
    // Not configured yet - fail safe, don't throw and don't fake success.
    return null;
  }

  try {
    const id = crypto.randomUUID();
    const event: AnalyticsEvent = {
      id,
      workspaceId: params.workspaceId.trim(),
      eventName: params.eventName,
      actorType: params.actorType,
      actorId: params.actorId,
      properties: filterProperties(params.properties),
      isTest: params.isTest ?? false,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    await db
      .collection("workspaces")
      .doc(event.workspaceId)
      .collection("analyticsEvents")
      .doc(event.id)
      .set({ ...event });

    return event;
  } catch (error) {
    console.warn("[analytics] event tracking failed gracefully", error);
    return null;
  }
}
