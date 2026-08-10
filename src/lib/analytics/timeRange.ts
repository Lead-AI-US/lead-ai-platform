export const ALLOWED_TIME_RANGES = ["7d", "30d", "all"] as const;
export type TimeRange = (typeof ALLOWED_TIME_RANGES)[number];

/** Only "7d" | "30d" | "all" are valid. Anything else must 400, never silently become "all". */
export function parseTimeRange(value: unknown): TimeRange | null {
  if (typeof value !== "string") return null;
  return (ALLOWED_TIME_RANGES as readonly string[]).includes(value) ? (value as TimeRange) : null;
}

export function cutoffIsoForRange(range: TimeRange, now: number = Date.now()): string | null {
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}
