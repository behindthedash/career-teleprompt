import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const promptSource = readFileSync("src-tauri/src/intelligence/prompt_templates.rs", "utf8");
const actionConfigSource = readFileSync("src-tauri/src/intelligence/action_config.rs", "utf8");

const promptStart = promptSource.indexOf("pub const WHAT_TO_SAY_PROMPT");
const promptEnd = promptSource.indexOf("pub const SHORTEN_PROMPT", promptStart);
assert.ok(promptStart >= 0 && promptEnd > promptStart, "WHAT_TO_SAY_PROMPT must be present");
const prompt = promptSource
  .slice(promptStart, promptEnd)
  .replace(/\\\r?\n/g, " ")
  .replace(/\\n/g, " ")
  .replace(/\s+/g, " ");

for (const required of [
  "ANSWER-HISTORY RULES",
  "earlier \\\"You:\\\" responses",
  "stories, examples, and claims the user has already used",
  "prefer a materially different example",
  "Do not force novelty",
  "previously used example is still the strongest truthful evidence",
  "Never invent a different project, metric, responsibility, technology, outcome, or implementation",
  "Use retrieved reference materials to find alternative supported examples",
]) {
  assert.ok(prompt.includes(required), `WhatToSay answer-history prompt must contain: ${required}`);
}

assert.ok(
  prompt.indexOf("ANSWER-HISTORY RULES") < prompt.indexOf("output only the words"),
  "answer-history policy must be established before the output-only instruction",
);

const whatToSayStart = actionConfigSource.indexOf('"WhatToSay".to_string()');
const shortenStart = actionConfigSource.indexOf('"Shorten".to_string()', whatToSayStart);
assert.ok(whatToSayStart >= 0 && shortenStart > whatToSayStart, "WhatToSay action config must be present");
const whatToSayConfig = actionConfigSource.slice(whatToSayStart, shortenStart);

assert.match(whatToSayConfig, /include_transcript:\s*true/);
assert.match(whatToSayConfig, /include_rag_chunks:\s*true/);
assert.match(
  whatToSayConfig,
  /transcript_window_seconds:\s*Some\(900\)/,
  "WhatToSay should retain a bounded 15-minute answer-history window",
);

console.log("interview answer-history policy tests: PASS");
