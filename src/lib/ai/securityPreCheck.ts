/**
 * Deterministic security pre-router — runs BEFORE any model call. Hostile
 * requests are handled by explicit policy, not routed to the model and
 * hoped to be refused correctly. Pure function, no I/O, fully unit-tested.
 */

const HOSTILE_PATTERNS: RegExp[] = [
  /system\s*prompt/i,
  // No \b around "api key" - real requests embed it in identifiers with no
  // word boundary, e.g. "OPENAI_API_KEY" (underscore is a \w character, so
  // \b never appears between "AI" and "_API").
  /api[\s_-]?key/i,
  /secret[\s_-]?key/i,
  /\bcredentials?\b/i,
  /ignore\s+(all\s+|previous\s+|the\s+)?instructions/i,
  /you\s+are\s+now\s+an?\s+unrestricted/i,
  /disregard\s+(your|all)\s+(rules|instructions)/i,
  /another\s+(customer|workspace|tenant|business)'?s?\s+(data|leads?|info)/i,
  /export\s+the\s+database/i,
  /show\s+me\s+.*\bleads?\b.*\bother\b/i,
  /firebase\s+credentials?/i,
  /private\s+leads?/i,
];

export function isHostileRequest(message: string): boolean {
  return HOSTILE_PATTERNS.some((pattern) => pattern.test(message));
}

export const SECURITY_REFUSAL_RESPONSE =
  "I can't provide private credentials, internal system instructions, or information " +
  "belonging to another customer. I can help with information about this business.";
