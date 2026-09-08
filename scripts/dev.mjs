#!/usr/bin/env node
// `npm run dev` entry point.
//
// Asks which Gemini backend this local session should use — Vertex AI (local
// gcloud ADC) or the Gemini Developer API key — then starts `next dev` with
// GEMINI_MODE set accordingly. Deployed builds don't go through this script;
// they default to API-key mode on their own (see lib/gemini.js).
//
// The prompt is skipped when GEMINI_MODE is already set or when stdin isn't a
// TTY, so CI and `GEMINI_MODE=api npm run dev` still work unattended.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

// Minimal .env reader, only so the prompt can show which credentials you
// already have. Next.js loads these files itself for the actual dev server.
function readEnvFiles() {
  const values = {};
  for (const file of [".env", ".env.local"]) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value) values[match[1]] = value;
    }
  }
  return values;
}

function startNextDev(mode) {
  const bin = path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next"
  );
  const args = ["dev", ...process.argv.slice(2)];
  const child = spawn(bin, args, {
    stdio: "inherit",
    env: { ...process.env, GEMINI_MODE: mode },
  });
  child.on("exit", (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });
  child.on("error", (err) => {
    console.error(`Failed to start next dev: ${err.message}`);
    process.exit(1);
  });
}

async function main() {
  const preset = (process.env.GEMINI_MODE || "").trim().toLowerCase();
  if (preset === "api" || preset === "vertex") {
    console.log(`Gemini: ${preset} mode (from GEMINI_MODE).`);
    startNextDev(preset);
    return;
  }

  if (!process.stdin.isTTY) {
    console.log("Gemini: vertex mode (non-interactive shell, default).");
    startNextDev("vertex");
    return;
  }

  const env = { ...readEnvFiles(), ...process.env };
  const hasKey = !!env.GEMINI_API_KEY;
  const hasProject = !!env.GOOGLE_CLOUD_PROJECT;

  console.log("\nWhich Gemini backend should this dev session use?");
  console.log(
    `  1) Vertex AI — local gcloud ADC, no daily cap   ${
      hasProject ? "[GOOGLE_CLOUD_PROJECT set]" : "[GOOGLE_CLOUD_PROJECT missing]"
    }`
  );
  console.log(
    `  2) Gemini API key — ~1,500 requests/day free    ${
      hasKey ? "[GEMINI_API_KEY set]" : "[GEMINI_API_KEY missing]"
    }`
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let mode = "vertex";
  try {
    const answer = (await rl.question("Choose 1 or 2 [default 1]: ")).trim().toLowerCase();
    mode = answer === "2" || answer === "api" ? "api" : "vertex";
  } catch {
    // Ctrl+D or stdin closed at the prompt — fall back to the default rather
    // than dying with an unhandled AbortError.
    console.log("\nNo answer given — defaulting to Vertex AI.");
  } finally {
    rl.close();
  }

  if (mode === "api" && !hasKey) {
    console.warn(
      "\n⚠  GEMINI_API_KEY isn't set in .env.local — summarizing will fail until you add it.\n" +
        "   Get one at https://aistudio.google.com/apikey\n"
    );
  }
  if (mode === "vertex" && !hasProject) {
    console.warn(
      "\n⚠  GOOGLE_CLOUD_PROJECT isn't set in .env.local — summarizing will fail until you add it.\n"
    );
  }

  console.log(`\nStarting with Gemini ${mode} mode…\n`);
  startNextDev(mode);
}

main();
