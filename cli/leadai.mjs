#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export const CONFIG_DIR = join(homedir(), ".config", "leadai");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const secretPatterns = [/api[_-]?key/i, /token/i, /secret/i, /private/i, /password/i, /credential/i];

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

export function loadConfig(file = CONFIG_FILE) {
  if (!existsSync(file)) return { exists: false, data: {} };
  return { exists: true, data: JSON.parse(readFileSync(file, "utf8")) };
}

function commandAvailable(command, args = ["--version"]) {
  try {
    const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { available: true, output: output.split("\n")[0] };
  } catch {
    return { available: false };
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

function formatCheck(label, ok, detail) {
  return `${label.padEnd(22)} ${ok ? "OK" : "NOT CONFIGURED"}${detail ? ` - ${detail}` : ""}`;
}

export function runDoctor() {
  const gh = commandAvailable("gh", ["--version"]);
  const hf = commandAvailable("hf", ["--version"]);
  const kaggle = commandAvailable("kaggle", ["--version"]);

  return [
    "Lead.AI Doctor",
    formatCheck("Node", true, process.version),
    formatCheck("Git status", true, gitStatus()),
    formatCheck("Environment file", existsSync(".env") || existsSync(".env.local"), ".env or .env.local presence only"),
    formatCheck("Firebase public config", hasEnv("VITE_FIREBASE_PROJECT_ID"), "project id presence only"),
    formatCheck("Firebase Admin", hasEnv("FIREBASE_PROJECT_ID") || hasEnv("FIREBASE_SERVICE_ACCOUNT_JSON"), "server config presence only"),
    formatCheck("OpenAI", hasEnv("OPENAI_API_KEY"), "secret value is never printed"),
    formatCheck("GitHub CLI installed", gh.available, gh.output ?? "not installed"),
    formatCheck("Hugging Face CLI", hf.available, hf.output ?? "not installed"),
    formatCheck("Kaggle CLI", kaggle.available, kaggle.output ?? "not installed"),
    formatCheck("Build scripts", existsSync("package.json"), "package.json present"),
  ].join("\n");
}

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

async function main(argv = process.argv.slice(2)) {
  const [command, subcommand] = argv;

  if (!command || command === "help" || command === "--help") {
    console.log(`Lead.AI CLI

Usage:
  leadai doctor
  leadai status
  leadai config show
  leadai workspace current
`);
    return 0;
  }

  if (command === "doctor") {
    console.log(runDoctor());
    return 0;
  }

  if (command === "status") {
    console.log("Lead.AI Platform: local development");
    console.log(formatCheck("Config file", loadConfig().exists, CONFIG_FILE));
    console.log(formatCheck("Repository", existsSync(".git"), gitStatus()));
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
