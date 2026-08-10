import { describe, it, expect } from "vitest";
import { isOriginAllowed } from "./originPolicy";

describe("isOriginAllowed — widget origin allowlist (deny by default)", () => {
  const allowed = ["https://example-business.com", "https://www.example-business.com"];

  it("allows an exact match", () => {
    expect(isOriginAllowed("https://example-business.com", allowed)).toBe(true);
  });

  it("denies an unlisted origin", () => {
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
  });

  it("denies a missing origin header", () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
  });

  it("denies a subdomain that wasn't explicitly listed", () => {
    expect(isOriginAllowed("https://sub.example-business.com", allowed)).toBe(false);
  });

  it("allows localhost for local widget development", () => {
    expect(isOriginAllowed("http://localhost:5173", [])).toBe(true);
  });

  it("does not fall back to allowing an origin just because the allowlist is empty", () => {
    expect(isOriginAllowed("https://example-business.com", [])).toBe(false);
  });
});
