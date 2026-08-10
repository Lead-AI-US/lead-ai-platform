#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export const CONFIG_DIR = join(homedir(), ".config", "leadai");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const secretPatterns = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /token/i,
  /secret/i,
  /private/i,
  /password/i,
  /credential/i,
  /^key$/i,
];

export function redactConfig(value) {
  if (Array.isArray(value)) return value.map(redactConfig);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        secretPatterns.some((pattern) => pattern.test(key)) ? "[redacted]" : redactConfig(nested),
      ])
    );
  }

  return value;
}

export function redactText(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]")
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, "gh[redacted]")
    .replace(/hf_[A-Za-z0-9_]+/g, "hf_[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, "[redacted private key]");
}

export function loadConfig(file = CONFIG_FILE) {
  if (!existsSync(file)) return { exists: false, data: {} };
  return { exists: true, data: JSON.parse(readFileSync(file, "utf8")) };
}

export function commandAvailable(command, args = ["--version"]) {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { available: true, output: redactText(output).split("\n")[0] };
  } catch {
    return { available: false, output: "not installed" };
  }
}

function commandSucceeds(command, args) {
  try {
    execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function gitStatus() {
  try {
    const status = execFileSync("git", ["status", "--short"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return status ? "working tree has changes" : "clean";
  } catch {
    return "git unavailable";
  }
}

function hasEnv(name) {
  return Boolean(process.env[name]);
}

function hasAnyEnv(names) {
  return names.some((name) => hasEnv(name));
}

function formatCheck(label, ok, detail) {
  return `${label.padEnd(22)} ${ok ? "OK" : "NOT CONFIGURED"}${detail ? ` - ${detail}` : ""}`;
}

export function detectProviders({ checkAuth = true } = {}) {
  const gh = commandAvailable("gh", ["--version"]);
  const hf = commandAvailable("hf", ["--version"]);
  const kaggle = commandAvailable("kaggle", ["--version"]);

  return [
    {
      provider: "github",
      cliInstalled: gh.available,
      cliVersion: gh.output ?? "not installed",
      cliAuthenticated: gh.available && checkAuth ? commandSucceeds("gh", ["auth", "status"]) : false,
      serverAuthConfigured: hasAnyEnv(["GITHUB_TOKEN", "GH_TOKEN"]),
      productConnection: "not_configured",
    },
    {
      provider: "huggingface",
      cliInstalled: hf.available,
      cliVersion: hf.output ?? "not installed",
      cliAuthenticated: hf.available && checkAuth ? commandSucceeds("hf", ["auth", "whoami"]) : false,
      serverAuthConfigured: hasAnyEnv(["HF_TOKEN", "HUGGINGFACE_TOKEN"]),
      productConnection: "not_configured",
    },
    {
      provider: "kaggle",
      cliInstalled: kaggle.available,
      cliVersion: kaggle.output ?? "not installed",
      cliAuthenticated: hasEnv("KAGGLE_USERNAME") && hasEnv("KAGGLE_KEY"),
      serverAuthConfigured: hasEnv("KAGGLE_USERNAME") && hasEnv("KAGGLE_KEY"),
      productConnection: "not_configured",
    },
  ];
}

function serializeStatus() {
  const config = loadConfig();
  return {
    platform: "Lead.AI Platform",
    mode: "local development",
    configFile: {
      exists: config.exists,
      path: CONFIG_FILE,
    },
    repository: {
      exists: existsSync(".git"),
      status: gitStatus(),
    },
  };
}

export function runDoctor({ json = false, checkAuth = true } = {}) {
  const providers = detectProviders({ checkAuth });
  const result = {
    node: process.version,
    gitStatus: gitStatus(),
    environmentFile: existsSync(".env") || existsSync(".env.local"),
    firebasePublicConfig: hasEnv("VITE_FIREBASE_PROJECT_ID"),
    firebaseAdmin: hasEnv("FIREBASE_PROJECT_ID") || hasEnv("FIREBASE_SERVICE_ACCOUNT_JSON") || hasEnv("FIREBASE_PRIVATE_KEY"),
    openai: hasEnv("OPENAI_API_KEY"),
    providers,
    buildScripts: existsSync("package.json"),
  };

  if (json) return JSON.stringify(redactConfig(result), null, 2);

  const providerLines = providers.flatMap((provider) => [
    formatCheck(`${provider.provider} CLI`, provider.cliInstalled, provider.cliVersion),
    formatCheck(`${provider.provider} auth`, provider.cliAuthenticated, provider.cliAuthenticated ? "authenticated locally" : "not authenticated locally"),
    formatCheck(
      `${provider.provider} product`,
      provider.productConnection === "connected",
      "workspace connection not configured"
    ),
  ]);

  return [
    "Lead.AI Doctor",
    formatCheck("Node", true, result.node),
    formatCheck("Git status", true, result.gitStatus),
    formatCheck("Environment file", result.environmentFile, ".env or .env.local presence only"),
    formatCheck("Firebase public config", result.firebasePublicConfig, "project id presence only"),
    formatCheck("Firebase Admin", result.firebaseAdmin, "server config presence only"),
    formatCheck("OpenAI", result.openai, "secret value is never printed"),
    ...providerLines,
    formatCheck("Build scripts", result.buildScripts, "package.json present"),
  ].join("\n");
}

export function runIntegrations({ json = false, checkAuth = true } = {}) {
  const providers = detectProviders({ checkAuth });
  if (json) return JSON.stringify(redactConfig({ providers }), null, 2);

  return [
    "Lead.AI Integrations",
    ...providers.map(
      (provider) =>
        `${provider.provider.padEnd(12)} CLI ${provider.cliInstalled ? "installed" : "not installed"} | auth ${
          provider.cliAuthenticated ? "authenticated" : "not configured"
        } | product NOT CONFIGURED`
    ),
  ].join("\n");
}

export function runAssets({ json = false } = {}) {
  const assets = [];
  if (json) return JSON.stringify({ assets }, null, 2);

  return [
    "Lead.AI Assets",
    "No linked AI assets are configured for this CLI workspace.",
    "Supported groups: repositories, models, datasets, spaces, notebooks.",
  ].join("\n");
}

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

async function main(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const filteredArgv = argv.filter((arg) => arg !== "--json");
  const [command, subcommand] = filteredArgv;

  if (!command || command === "help" || command === "--help") {
    console.log(`Lead.AI CLI

Usage:
  leadai doctor [--json]
  leadai status [--json]
  leadai integrations [--json]
  leadai assets [--json]
  leadai config show
  leadai workspace current
`);
    return 0;
  }

  if (command === "doctor") {
    console.log(runDoctor({ json }));
    return 0;
  }

  if (command === "status") {
    const status = serializeStatus();
    if (json) {
      console.log(JSON.stringify(redactConfig(status), null, 2));
      return 0;
    }
    console.log(`${status.platform}: ${status.mode}`);
    console.log(formatCheck("Config file", status.configFile.exists, status.configFile.path));
    console.log(formatCheck("Repository", status.repository.exists, status.repository.status));
    return 0;
  }

  if (command === "integrations") {
    console.log(runIntegrations({ json }));
    return 0;
  }

  if (command === "assets") {
    console.log(runAssets({ json }));
    return 0;
  }

  if (command === "config") {
    if (subcommand !== "show") {
      console.error("Unknown config command. Use: leadai config show");
      return 1;
    }
    await ensureConfigDir();
    console.log(JSON.stringify(redactConfig(loadConfig().data), null, 2));
    return 0;
  }

  if (command === "workspace") {
    if (subcommand !== "current") {
      console.error("Unknown workspace command. Use: leadai workspace current");
      return 1;
    }
    console.log("Resolved from Firebase Auth in the app. CLI workspace selection is not configured.");
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => {
    process.exitCode = code;
  });
}
