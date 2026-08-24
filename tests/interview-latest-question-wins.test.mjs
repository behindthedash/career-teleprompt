import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/overlay/QuestionDetector.tsx", "utf8");

assert.match(source, /type QuestionRequestState = "idle" \| "queued" \| "requested"/);
assert.match(source, /type QuestionRequestOrigin = "auto" \| "manual"/);
assert.match(source, /queuedQuestionRef = useRef<DetectedQuestion \| null>\(null\)/);
assert.match(source, /queuedOriginRef = useRef<QuestionRequestOrigin \| null>\(null\)/);
assert.match(source, /requestInFlightRef = useRef\(false\)/);
assert.match(source, /const \[requestInFlight, setRequestInFlight\] = useState\(false\)/);
assert.match(
  source,
  /if \(useStreamStore\.getState\(\)\.isStreaming \|\| requestInFlightRef\.current\) \{\s*queueLatestQuestion\(q, origin\)/s,
);
assert.match(source, /requestInFlightRef\.current = true;\s*setRequestInFlight\(true\)/s);
assert.match(
  source,
  /generateAssist\("WhatToSay", q\.text\)[\s\S]*?\.finally\(\(\) => \{\s*requestInFlightRef\.current = false;\s*setRequestInFlight\(false\)/,
);
assert.match(source, /setRequestState\(previousQueued, "idle"\)/);
assert.match(source, /Drain only after both the visible stream and the underlying generate_assist/);
assert.match(source, /if \(isStreaming \|\| requestInFlight\) return;\s*const queued = queuedQuestionRef\.current/s);
assert.match(source, /requestWhatToSay\(queued, origin\)/);
assert.match(source, /queuedOriginRef\.current !== "auto"/);
assert.match(source, /requestWhatToSay\(event, "auto"\)/);
assert.match(source, /requestWhatToSay\(question, "manual"\)/);
assert.match(source, /sameQuestion\(queuedQuestionRef\.current, target\)/);
assert.match(source, /state === "queued" \? "Queued"/);

console.log("latest-question-wins generation queue contract passed");
