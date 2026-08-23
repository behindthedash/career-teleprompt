import assert from "node:assert/strict";
import {
  alignTranscript,
  transcriptTokens,
} from "../.tmp-teleprompter-tests/follower.js";

const script = `I have spent the last several years building data platforms that translate complex operational systems into trusted analytics and practical AI solutions.
What excites me about this role is the chance to work directly with legal and compliance teams and build systems they can trust.
My approach is to start with the workflow and the risk boundaries before choosing the model or architecture.
Then I build the retrieval layer explicit gates and measurable evaluation around it.
A concrete example is an NDA review assistant that retrieves internal standards compares a proposed agreement against those standards and routes uncertain or high risk clauses to an attorney.`;
const expected = transcriptTokens(script);

let result = alignTranscript(
  expected,
  "I have spent the last several years building data platforms",
  0,
);
assert.equal(result.status, "following");
assert.ok(result.position >= 10, "exact speech should advance");
let position = result.position;

result = alignTranscript(
  expected,
  "I have spent the last several years building really useful data platforms that translate complex operational systems into trusted analytics",
  position,
);
assert.equal(result.status, "following");
assert.ok(result.position > position, "filler words should not stop progress");
position = result.position;

result = alignTranscript(
  expected,
  "building data platforms that translate operational systems into trusted analytics and practical AI solutions",
  position,
);
assert.equal(result.status, "following");
assert.ok(result.position >= position, "skipped prepared words should still align");
position = result.position;

result = alignTranscript(
  expected,
  "I have spent the last several years building data platforms",
  position,
);
assert.equal(result.position, position, "repeating an earlier phrase must never move backward");

result = alignTranscript(
  expected,
  "thanks that is a really interesting question let me think about it for a moment",
  position,
);
assert.equal(result.position, position, "unrelated speech should hold position");
assert.notEqual(result.status, "following");

result = alignTranscript(
  expected,
  "A concrete example is an NDA review assistant that retrieves internal standards compares a proposed agreement against those standards",
  position,
);
assert.equal(result.status, "following");
assert.equal(result.recovered, true, "a strong distant match should recover after a deliberate jump");
assert.ok(result.position > position + 30, "recovery should jump forward substantially");
position = result.position;

const correctedPartial = alignTranscript(
  expected,
  "an NDA review assistant that retrieves internal standards compares a proposed agreement against those standard",
  position,
);
assert.ok(correctedPartial.position >= position, "an STT correction must remain monotonic");

console.log("teleprompter follower tests: PASS");
