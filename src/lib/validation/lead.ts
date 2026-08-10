import { z } from "zod";
import { LEAD_STATUSES } from "@/types/lead";

export const CreateLeadSchema = z.object({
  source: z.enum(["website_chat", "manual"]),
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
  conversationId: z.string().trim().max(200).optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
});
export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;
