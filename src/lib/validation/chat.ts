import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "../../types/conversation.js";

/** Inbound payload to POST /api/chat — one visitor message. */
export const ChatMessageInputSchema = z.object({
  widgetKey: z.string().trim().min(10).max(200),
  conversationId: z.string().trim().max(200).optional(),
  visitorSessionId: z.string().trim().min(6).max(200),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});
export type ChatMessageInput = z.infer<typeof ChatMessageInputSchema>;
