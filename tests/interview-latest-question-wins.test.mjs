import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/overlay/QuestionDetector.tsx", "utf8");

assert.match(source, /type QuestionRequestState = "idle" \| "queued" \| "requested"/);
assert.match(source, /type QuestionRequestOrigin = "auto" \| "manual"/);
assert.match(source, /queuedQuestionRef = useRef<DetectedQuestion \| null>\(null\)/);
assert.match(source, /queuedOriginRef = useRef<QuestionRequestOrigin \| null>\(null\)/);
assert.match(source, /if \(useStreamStore\.getState\(\)\.isStreaming\) \{\s*queueLatestQuestion\(q, origin\)/s);
assert.match(source, /setRequestState\(previousQueued, "idle"\)/);
assert.match(source, /Once the current stream finishes, generate only the newest queued question/);
assert.match(source, /if \(isStreaming\) return;\s*const queued = queuedQuestionRef\.current/s);
assert.match(source, /requestWhatToSay\(queued, origin\)/);
assert.match(source, /queuedOriginRef\.current !== "auto"/);
assert.match(source, /requestWhatToSay\(event, "auto"\)/);
assert.match(source, /requestWhatToSay\(question, "manual"\)/);
assert.match(source, /sameQuestion\(queuedQuestionRef\.current, target\)/);
assert.match(source, /state === "queued" \? "Queued"/);

console.log("latest-question-wins generation queue contract passed");
