import assert from "node:assert/strict";
import { shouldActivatePendingAnswer } from "../.tmp-teleprompter-tests/completion.js";

const base = {
  hasPendingDocument: true,
  followingEnabled: true,
  followerStatus: "following",
  confidence: 0.9,
  cursorPosition: 9,
  totalTokens: 10,
};

assert.equal(shouldActivatePendingAnswer(base), true);
assert.equal(shouldActivatePendingAnswer({ ...base, hasPendingDocument: false }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, followingEnabled: false }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, followerStatus: "uncertain" }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, followerStatus: "lost" }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, confidence: 0.71 }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, cursorPosition: 8 }), false);
assert.equal(shouldActivatePendingAnswer({ ...base, totalTokens: 0, cursorPosition: 0 }), false);

console.log("teleprompter completion policy tests: PASS");
