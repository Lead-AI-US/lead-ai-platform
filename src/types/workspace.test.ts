import { describe, it, expect } from "vitest";
import { roleAtLeast, workspaceMemberDocId, type WorkspaceRole } from "./workspace";

describe("roleAtLeast — membership authorization ordering", () => {
  const ROLES: WorkspaceRole[] = ["viewer", "member", "admin", "owner"];

  it("a role satisfies its own minimum", () => {
    for (const role of ROLES) {
      expect(roleAtLeast(role, role)).toBe(true);
    }
  });

  it("owner satisfies every minimum", () => {
    for (const min of ROLES) {
      expect(roleAtLeast("owner", min)).toBe(true);
    }
  });

  it("viewer does not satisfy anything above viewer", () => {
    expect(roleAtLeast("viewer", "member")).toBe(false);
    expect(roleAtLeast("viewer", "admin")).toBe(false);
    expect(roleAtLeast("viewer", "owner")).toBe(false);
  });

  it("member satisfies member/viewer but not admin/owner", () => {
    expect(roleAtLeast("member", "viewer")).toBe(true);
    expect(roleAtLeast("member", "member")).toBe(true);
    expect(roleAtLeast("member", "admin")).toBe(false);
    expect(roleAtLeast("member", "owner")).toBe(false);
  });

  it("admin satisfies admin/member/viewer but not owner", () => {
    expect(roleAtLeast("admin", "viewer")).toBe(true);
    expect(roleAtLeast("admin", "member")).toBe(true);
    expect(roleAtLeast("admin", "admin")).toBe(true);
    expect(roleAtLeast("admin", "owner")).toBe(false);
  });
});

describe("workspaceMemberDocId", () => {
  it("joins workspaceId and userId with an underscore", () => {
    expect(workspaceMemberDocId("ws_1", "user_1")).toBe("ws_1_user_1");
  });
});
