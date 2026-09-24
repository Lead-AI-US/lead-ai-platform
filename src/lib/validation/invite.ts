import { z } from "zod";

export const CreateInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(320),
  role: z.enum(["viewer", "member", "admin", "owner"]),
});
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
