import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/overlay/QuestionDetector.tsx", "utf8");

assert.match(source, /onQuestionDetected/);
assert.match(source, /useConfigStore\.getState\(\)\.autoTrigger/);
assert.match(source, /useStreamStore\.getState\(\)\.isStreaming/);
assert.match(source, /generateAssist\("WhatToSay", q\.text\)/);
assert.doesNotMatch(source, /generateAssist\("Assist"/);
assert.doesNotMatch(source, /looksLikeQuestion/);
assert.doesNotMatch(source, /useTranscriptStore/);
assert.match(source, /Rust question detector is authoritative/);

console.log("automatic What to Say question-flow contract passed");
