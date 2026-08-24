import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const promptSource = readFileSync("src-tauri/src/intelligence/prompt_templates.rs", "utf8");
const ragSource = readFileSync("src-tauri/src/rag/prompt_builder.rs", "utf8");

const promptStart = promptSource.indexOf("pub const WHAT_TO_SAY_PROMPT");
const promptEnd = promptSource.indexOf("pub const SHORTEN_PROMPT", promptStart);
assert.ok(promptStart >= 0 && promptEnd > promptStart, "WHAT_TO_SAY_PROMPT must be present");
const prompt = promptSource
  .slice(promptStart, promptEnd)
  .replace(/\\\r?\n/g, " ")
  .replace(/\\n/g, " ")
  .replace(/\s+/g, " ");

for (const required of [
  "PREPARED-Q&A RULES",
  "Prepared Interview Q&A",
  "prefer that prepared answer as the primary wording",
  "Do not force a prepared answer onto a tangential question",
  "never overrides the grounding rules",
]) {
  assert.ok(prompt.includes(required), `prepared-Q&A prompt contract must contain: ${required}`);
}

assert.ok(
  prompt.indexOf("GROUNDING RULES") < prompt.indexOf("PREPARED-Q&A RULES"),
  "grounding must be established before prepared-Q&A preference",
);
assert.ok(
  prompt.indexOf("PREPARED-Q&A RULES") < prompt.indexOf("ANSWER-HISTORY RULES"),
  "prepared-Q&A selection must remain subject to answer-history policy",
);

for (const required of [
  "prepared_qa_question",
  '"question:"',
  '"q:"',
  '"answer:"',
  '"a:"',
  "## Prepared Interview Q&A",
  "Prepared question:",
  "partition",
]) {
  assert.ok(ragSource.includes(required), `prepared-Q&A retrieval path must contain: ${required}`);
}

console.log("prepared Q&A retrieval policy tests: PASS");
