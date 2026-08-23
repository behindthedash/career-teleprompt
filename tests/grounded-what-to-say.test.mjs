import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src-tauri/src/intelligence/prompt_templates.rs", "utf8");
const start = source.indexOf("pub const WHAT_TO_SAY_PROMPT");
const end = source.indexOf("pub const SHORTEN_PROMPT", start);
assert.ok(start >= 0 && end > start, "WHAT_TO_SAY_PROMPT must be defined before SHORTEN_PROMPT");

// Rust uses `\` at physical line endings to keep these prompt literals readable.
// Normalize those source-level continuations before testing the effective prompt contract.
const prompt = source
  .slice(start, end)
  .replace(/\\\r?\n/g, " ")
  .replace(/\s+/g, " ");

for (const required of [
  "Never invent or",
  "implemented or prototype work",
  "design, proposed, planned, conceptual, or hypothetical work",
  "never turn it into a claim that the user implemented it in production",
  "Do not attribute a company, team, customer, or third-party example to the user",
  "acknowledge the gap",
  "Do not fabricate a stronger answer",
  "evidence conflicts or is too weak",
]) {
  assert.ok(prompt.includes(required), `grounding prompt must contain: ${required}`);
}

assert.ok(
  prompt.indexOf("source of truth") < prompt.indexOf("output only the words"),
  "grounding rules should be established before output-format instructions",
);

console.log("grounded What to Say prompt tests: PASS");
