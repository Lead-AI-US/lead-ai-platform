import { describe, expect, it } from "vitest";
import { sanitizeEventMetadata, toTimelineItems } from "./eventService";
import type { BusinessEvent } from "@/types/event";

describe("sanitizeEventMetadata", () => {
  it("keeps allow-listed primitive metadata", () => {
    expect(sanitizeEventMetadata({ intent: "appointment", confidence: 0.8, status: "new" })).toEqual({
      intent: "appointment",
      confidence: 0.8,
      status: "new",
    });
  });

  it("drops secret-bearing keys and unapproved metadata", () => {
    expect(
      sanitizeEventMetadata({
        intent: "faq",
        OPENAI_API_KEY: "secret",
        authorization: "Bearer abc",
        email: "customer@example.com",
        nested: { unsafe: true },
      })
    ).toEqual({ intent: "faq" });
  });
});

describe("toTimelineItems", () => {
  it("orders newest first", () => {
    const base: Omit<BusinessEvent, "id" | "type" | "occurredAt"> = {
      workspaceId: "ws_1",
      actor: { type: "system" },
      source: {},
      metadata: {},
    };
    const items = toTimelineItems([
      { ...base, id: "old", type: "conversation_started", occurredAt: "2026-01-01T00:00:00.000Z" },
      { ...base, id: "new", type: "lead_created", occurredAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(items.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
