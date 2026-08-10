import { describe, it, expect } from "vitest";
import { filterProperties, trackEvent } from "./track";

describe("filterProperties — analytics allow-list", () => {
  it("keeps allow-listed keys with primitive values", () => {
    expect(filterProperties({ source: "web_app", count: 3, reason: null })).toEqual({
      source: "web_app",
      count: 3,
      reason: null,
    });
  });

  it("drops keys not on the allow-list, even if the value looks safe", () => {
    expect(filterProperties({ email: "visitor@example.com", source: "web_app" })).toEqual({ source: "web_app" });
  });

  it("drops object/array values even for allow-listed keys", () => {
    expect(filterProperties({ source: { nested: true } as unknown as string })).toEqual({});
  });

  it("returns an empty object for undefined input", () => {
    expect(filterProperties(undefined)).toEqual({});
  });
});

describe("trackEvent — fail closed on missing workspaceId", () => {
  it("rejects an event with an empty workspaceId before touching the database", async () => {
    const event = await trackEvent({
      workspaceId: "",
      eventName: "lead_created",
      actorType: "visitor",
    });
    expect(event).toBeNull();
  });

  it("rejects an event with a whitespace-only workspaceId", async () => {
    const event = await trackEvent({
      workspaceId: "   ",
      eventName: "lead_created",
      actorType: "visitor",
    });
    expect(event).toBeNull();
  });
});
