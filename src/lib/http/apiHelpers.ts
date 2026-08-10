import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { z } from "zod";

/** Parses+validates req.body against a Zod schema. Writes 400 and returns null on failure. */
export function parseBody<T>(
  req: VercelRequest,
  res: VercelResponse,
  schema: z.ZodSchema<T>
): T | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "invalid_input", issues: result.error.issues.map((i) => i.message) });
    return null;
  }
  return result.data;
}

export function getPathParam(req: VercelRequest, name: string): string | null {
  const value = req.query[name];
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

/** Never leak internal error details to the client - log server-side, respond generically. */
export function safeServerError(res: VercelResponse, context: string, error: unknown) {
  console.error(`[api] ${context}`, error instanceof Error ? error.message : error);
  res.status(500).json({ error: "internal_error" });
}
