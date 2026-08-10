import { describe, it, expect } from "vitest";
import { OnboardingSchema, slugify } from "./onboarding";
import { CreateLeadSchema, UpdateLeadStatusSchema } from "./lead";
import { CreateKnowledgeSchema } from "./knowledge";
import { ChatMessageInputSchema } from "./chat";
import { UpdateWorkspaceSettingsSchema } from "./workspaceSettings";
import { MAX_MESSAGE_LENGTH } from "@/types/conversation";

describe("OnboardingSchema", () => {
  it("accepts a valid onboarding payload", () => {
    const result = OnboardingSchema.safeParse({
      businessName: "Kim Dental Clinic",
      businessType: "dental clinic",
      timezone: "America/New_York",
      primaryGoal: "capture more after-hours leads",
      websiteDomain: "kimdental.example",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a business name that's too short", () => {
    expect(OnboardingSchema.safeParse({ businessName: "K", businessType: "x", timezone: "UTC", primaryGoal: "goal" }).success).toBe(
      false
    );
  });

  it("rejects an invalid website domain", () => {
    const result = OnboardingSchema.safeParse({
      businessName: "Acme", businessType: "x", timezone: "UTC", primaryGoal: "goal", websiteDomain: "not a domain",
    });
    expect(result.success).toBe(false);
  });
});

describe("slugify", () => {
  it("lowercases, hyphenates, and appends the suffix", () => {
    expect(slugify("Kim Dental Clinic!", "ab12cd")).toBe("kim-dental-clinic-ab12cd");
  });

  it("falls back to 'workspace' when the name has no usable characters", () => {
    expect(slugify("!!!", "xyz")).toBe("workspace-xyz");
  });
});

describe("CreateLeadSchema", () => {
  it("accepts a minimal manual lead", () => {
    expect(CreateLeadSchema.safeParse({ source: "manual" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(CreateLeadSchema.safeParse({ source: "website_chat", email: "not-an-email" }).success).toBe(false);
  });
});

describe("UpdateLeadStatusSchema", () => {
  it("rejects a status outside the known enum", () => {
    expect(UpdateLeadStatusSchema.safeParse({ status: "won" }).success).toBe(false);
  });
});

describe("CreateKnowledgeSchema", () => {
  it("rejects empty content", () => {
    expect(CreateKnowledgeSchema.safeParse({ title: "Hours", content: "" }).success).toBe(false);
  });
});

describe("ChatMessageInputSchema", () => {
  it("rejects a message over the max length", () => {
    const result = ChatMessageInputSchema.safeParse({
      widgetKey: "wk_1234567890",
      visitorSessionId: "session-123456",
      message: "a".repeat(MAX_MESSAGE_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const result = ChatMessageInputSchema.safeParse({
      widgetKey: "wk_1234567890",
      visitorSessionId: "session-123456",
      message: "What are your hours?",
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateWorkspaceSettingsSchema", () => {
  it("rejects a non-URL origin", () => {
    const result = UpdateWorkspaceSettingsSchema.safeParse({ allowedOrigins: ["not-a-url"] });
    expect(result.success).toBe(false);
  });

  it("accepts a valid https origin", () => {
    const result = UpdateWorkspaceSettingsSchema.safeParse({ allowedOrigins: ["https://example.com"] });
    expect(result.success).toBe(true);
  });
});
