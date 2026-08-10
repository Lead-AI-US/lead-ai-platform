import { describe, it, expect } from "vitest";
import { parseTimeRange, cutoffIsoForRange } from "./timeRange";

describe("parseTimeRange", () => {
  it("accepts the three documented values", () => {
    expect(parseTimeRange("7d")).toBe("7d");
    expect(parseTimeRange("30d")).toBe("30d");
    expect(parseTimeRange("all")).toBe("all");
  });

  it("rejects arbitrary strings instead of silently defaulting to 'all'", () => {
    expect(parseTimeRange("90d")).toBeNull();
    expect(parseTimeRange("")).toBeNull();
    expect(parseTimeRange("ALL")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(parseTimeRange(undefined)).toBeNull();
    expect(parseTimeRange(123)).toBeNull();
    expect(parseTimeRange(["7d"])).toBeNull();
  });
});

describe("cutoffIsoForRange", () => {
  const now = new Date("2026-08-09T00:00:00.000Z").getTime();

  it("returns a cutoff 7 days back for '7d'", () => {
    expect(cutoffIsoForRange("7d", now)).toBe("2026-08-02T00:00:00.000Z");
  });

  it("returns a cutoff 30 days back for '30d'", () => {
    expect(cutoffIsoForRange("30d", now)).toBe("2026-07-10T00:00:00.000Z");
  });

  it("returns null (no cutoff) for 'all'", () => {
    expect(cutoffIsoForRange("all", now)).toBeNull();
  });
});
