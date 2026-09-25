import { describe, expect, it } from "vitest";
import { canManageMemberRole, wouldRemoveLastOwner } from "./memberPolicy";

describe("canManageMemberRole", () => {
  it("lets an admin manage member/viewer roles", () => {
    expect(canManageMemberRole("admin", "member", "viewer")).toBe(true);
    expect(canManageMemberRole("admin", "viewer", "member")).toBe(true);
  });

  it("blocks an admin from touching another admin or an owner", () => {
    expect(canManageMemberRole("admin", "admin", "member")).toBe(false);
    expect(canManageMemberRole("admin", "owner", "member")).toBe(false);
  });

  it("blocks an admin from promoting anyone to admin or owner", () => {
    expect(canManageMemberRole("admin", "member", "admin")).toBe(false);
    expect(canManageMemberRole("admin", "member", "owner")).toBe(false);
  });

  it("lets an owner manage any role, including other owners/admins", () => {
    expect(canManageMemberRole("owner", "admin", "owner")).toBe(true);
    expect(canManageMemberRole("owner", "owner", "admin")).toBe(true);
    expect(canManageMemberRole("owner", "member", "viewer")).toBe(true);
  });
});

describe("wouldRemoveLastOwner", () => {
  it("allows demoting a non-last owner", () => {
    expect(
      wouldRemoveLastOwner({ targetWasActiveOwner: true, remainingActiveOwners: 1, nextRole: "admin" })
    ).toBe(false);
  });

  it("blocks demoting the last owner's role", () => {
    expect(
      wouldRemoveLastOwner({ targetWasActiveOwner: true, remainingActiveOwners: 0, nextRole: "admin" })
    ).toBe(true);
  });

  it("blocks disabling the last owner even without a role change", () => {
    expect(
      wouldRemoveLastOwner({ targetWasActiveOwner: true, remainingActiveOwners: 0, nextStatus: "disabled" })
    ).toBe(true);
  });

  it("allows a no-op update on the last owner (stays owner, stays active)", () => {
    expect(
      wouldRemoveLastOwner({
        targetWasActiveOwner: true,
        remainingActiveOwners: 0,
        nextRole: "owner",
        nextStatus: "active",
      })
    ).toBe(false);
  });

  it("is a no-op check for a member who was never an active owner", () => {
    expect(
      wouldRemoveLastOwner({ targetWasActiveOwner: false, remainingActiveOwners: 0, nextStatus: "disabled" })
    ).toBe(false);
  });
});
