/**
 * Minimal local dev server for the api/*.ts serverless functions —
 * LOCAL DEV / TEST ONLY, never used for staging or production (those run
 * on real Vercel infrastructure).
 *
 * Why this exists: the real local-dev path for these functions is
 * `vercel dev`, but that requires an interactive OAuth device-login flow
 * this environment can't complete non-interactively. This script is a
 * thin, generic adapter — it does not reimplement any handler logic, it
 * just discovers api/*.ts files, builds Vercel-style dynamic routes
 * ([param] folders/files -> req.query.param), and calls the same
 * `export default function handler(req, res)` every one of those files
 * already exports. Every request still runs the real handler code:
 * requireFirebaseUser/requireWorkspaceRole, Firestore Admin SDK calls
 * (pointed at the emulator via FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST — see .env.local), the real orchestrator.
 *
 * Run with: npx tsx scripts/local-api-server.mts
 * (see docs/LOCAL_DEVELOPMENT.md for the full pilot-journey e2e setup)
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { widgetSnippet } from "../src/lib/workspace/widgetSnippet.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, "..", "api");

// Tiny inline .env.local loader — avoids depending on how `tsx`/`node`
// flag-passing interacts with --env-file. Local dev/test only.
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

const PORT = Number(process.env.LOCAL_API_PORT ?? 3001);

interface Route {
  pattern: RegExp;
  paramNames: string[];
  filePath: string;
}

function walk(dir: string, segments: string[], routes: Route[]) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      const isDynamic = entry.startsWith("[") && entry.endsWith("]");
      const segment = isDynamic ? `:${entry.slice(1, -1)}` : entry;
      walk(full, [...segments, segment], routes);
      continue;
    }
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;

    const base = entry.replace(/\.ts$/, "");
    const isDynamicFile = base.startsWith("[") && base.endsWith("]");
    const routeSegments =
      base === "index" ? segments : [...segments, isDynamicFile ? `:${base.slice(1, -1)}` : base];

    const paramNames: string[] = [];
    const patternSource = routeSegments
      .map((segment) => {
        if (segment.startsWith(":")) {
          paramNames.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");

    routes.push({
      pattern: new RegExp(`^/api${patternSource ? "/" + patternSource : ""}/?$`),
      paramNames,
      filePath: full,
    });
  }
}

function buildRoutes(): Route[] {
  const routes: Route[] = [];
  walk(API_ROOT, [], routes);
  // Longer (more specific) patterns first, so /leads/:leadId doesn't
  // shadow a route requiring an exact literal match.
  return routes.sort((a, b) => b.pattern.source.length - a.pattern.source.length);
}

const routes = buildRoutes();
console.log(`[local-api-server] Discovered ${routes.length} routes under api/`);

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}

function adaptResponse(res: ServerResponse) {
  const adapted = res as ServerResponse & {
    status: (code: number) => typeof adapted;
    json: (body: unknown) => void;
  };
  adapted.status = (code: number) => {
    adapted.statusCode = code;
    return adapted;
  };
  adapted.json = (body: unknown) => {
    adapted.setHeader("Content-Type", "application/json");
    adapted.end(JSON.stringify(body));
  };
  return adapted;
}

const server = createServer(async (req, res) => {
  const adaptedRes = adaptResponse(res);
  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    // E2E-test-only: hosts the REAL widgetSnippet() output on its own page,
    // standing in for "the business's own separate website" so the pilot
    // journey test can act as a real visitor against the real widget code,
    // not a re-implementation of it. Not part of the production API surface.
    if (url.pathname === "/_e2e/widget-host") {
      const widgetKey = url.searchParams.get("key") ?? "";
      // widgetSnippet() reads window.location.origin when called client-side
      // (the real, production call site — src/app/AppLayout.tsx). Called
      // here server-side, window doesn't exist, so it falls back to its
      // hardcoded production default. Rewrite that fallback to wherever
      // this harness is actually reachable, so the embedded script posts
      // to the real local /api/chat instead of a real external domain.
      const actualOrigin = `http://${req.headers.host}`;
      const snippet = widgetSnippet(widgetKey).replace("https://app.lead-ai.us", actualOrigin);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<!doctype html><html><head><title>Mock business site</title></head><body><h1>Example Salon — mock business website</h1><p>This stands in for a real customer's own site with the Lead.AI widget installed.</p>${snippet}</body></html>`
      );
      return;
    }

    const match = routes.find((route) => route.pattern.test(url.pathname));

    if (!match) {
      adaptedRes.status(404).json({ error: "no_local_route", path: url.pathname });
      return;
    }

    const values = match.pattern.exec(url.pathname) ?? [];
    const query: Record<string, string> = {};
    match.paramNames.forEach((name, index) => {
      query[name] = values[index + 1];
    });
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;

    const moduleUrl = pathToFileURL(match.filePath).href;
    const mod = await import(moduleUrl);
    const handler = mod.default as (req: unknown, res: unknown) => Promise<void> | void;

    const vercelReq = Object.assign(req, { query, body, cookies: {} });
    await handler(vercelReq, adaptedRes);
  } catch (error) {
    console.error("[local-api-server] handler error", error);
    if (!res.headersSent) {
      adaptedRes.status(500).json({ error: "local_server_error" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`[local-api-server] Listening on http://127.0.0.1:${PORT}`);
});
