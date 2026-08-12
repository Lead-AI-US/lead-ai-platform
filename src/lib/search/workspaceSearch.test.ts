import { describe, expect, it } from "vitest";
import { buildWorkspaceSearchIndex, filterWorkspaceSearch } from "./workspaceSearch";

describe("workspace search foundation", () => {
  it("builds tenant-scoped result descriptors from already-scoped records", () => {
    const results = buildWorkspaceSearchIndex({
      customers: [
        {
          id: "customer_1",
          workspaceId: "ws_1",
          displayName: "Sarah Mitchell",
          tags: [],
          firstSeenAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:00:00.000Z",
          conversationCount: 1,
          leadCount: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(filterWorkspaceSearch(results, "sarah")[0]?.destination).toBe("/app/customers/customer_1");
  });
});
