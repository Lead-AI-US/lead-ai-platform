import { z } from "zod";

export const UpdateMemberSchema = z
  .object({
    role: z.enum(["viewer", "member", "admin", "owner"]).optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: "role or status is required",
  });
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
