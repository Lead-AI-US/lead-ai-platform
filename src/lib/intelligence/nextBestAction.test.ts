import { describe, expect, it } from "vitest";
import { deriveNextBestActions } from "./nextBestAction";

describe("deriveNextBestActions", () => {
  it("recommends follow-up for qualified leads without a next action", () => {
    const actions = deriveNextBestActions({
      approvedKnowledgeCount: 1,
      events: [],
      leads: [
        {
          id: "lead_1",
          workspaceId: "ws_1",
          source: "manual",
          status: "qualified",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(actions[0]?.label).toBe("Schedule follow-up");
  });
});
