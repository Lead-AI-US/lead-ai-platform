/**
 * Widget origin validation - deny-by-default. A workspace's publicWidgetKey
 * resolves the workspace, but the request's Origin header must also match
 * one of that workspace's configured allowedOrigins (or localhost, for
 * local widget development). No wildcard CORS fallback.
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return true;
  }
  return allowedOrigins.includes(origin);
}
