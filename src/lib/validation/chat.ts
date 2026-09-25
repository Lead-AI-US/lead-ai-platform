import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "../../types/conversation.js";

/** Inbound payload to POST /api/chat — one visitor message. */
export const ChatMessageInputSchema = z.object({
  widgetKey: z.string().trim().min(10).max(200),
  // The real widget (src/lib/workspace/widgetSnippet.ts) initializes its
  // local conversationId to `null` and sends it as JSON `null` for a
  // visitor's first message, not an omitted key — .nullish() accepts both;
  // plain .optional() rejected `null` outright, which meant every real
  // first-time visitor message failed validation before this fix.
  conversationId: z.string().trim().max(200).nullish(),
  visitorSessionId: z.string().trim().min(6).max(200),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});
export type ChatMessageInput = z.infer<typeof ChatMessageInputSchema>;
