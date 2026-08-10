import { z } from "zod";

export const UpdateWorkspaceSettingsSchema = z.object({
  allowedOrigins: z
    .array(z.string().trim().url("Each origin must be a full URL, e.g. https://example.com"))
    .max(20)
    .optional(),
  timezone: z.string().trim().min(1).optional(),
  status: z.enum(["onboarding", "testing", "active", "suspended"]).optional(),
});
export type UpdateWorkspaceSettingsInput = z.infer<typeof UpdateWorkspaceSettingsSchema>;
