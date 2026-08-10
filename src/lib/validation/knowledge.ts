import { z } from "zod";

export const CreateKnowledgeSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(1).max(8000),
});
export type CreateKnowledgeInput = z.infer<typeof CreateKnowledgeSchema>;

export const UpdateKnowledgeStatusSchema = z.object({
  status: z.enum(["draft", "approved", "archived"]),
});
export type UpdateKnowledgeStatusInput = z.infer<typeof UpdateKnowledgeStatusSchema>;
