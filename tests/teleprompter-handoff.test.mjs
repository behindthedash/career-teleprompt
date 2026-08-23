import assert from "node:assert/strict";
import { teleprompterDocumentFromAIResponse } from "../.tmp-teleprompter-tests/handoff.js";

const sourced = teleprompterDocumentFromAIResponse({
  id: "response-42",
  content: "I build AI systems by starting with the workflow and the control points.",
  provider: "openai",
  model: "gpt-5",
  sources: [
    { title: "Resume", url: "rag://resume/experience" },
    { title: "Job description", url: "rag://job-description/ai" },
  ],
});

assert.equal(sourced.origin, "generated");
assert.equal(sourced.ephemeral, true);
assert.equal(sourced.responseSessionId, "response-42");
assert.equal(sourced.queryGeneration, 1);
assert.deepEqual(sourced.evidence, [
  { source: "rag://resume/experience", label: "Resume" },
  { source: "rag://job-description/ai", label: "Job description" },
]);
assert.match(sourced.sourceUri, /^response:\/\/response-42\/1$/);
assert.equal(sourced.sections.length, 1);
assert.ok(sourced.sections[0].matchText.includes("workflow"));

const providerOnly = teleprompterDocumentFromAIResponse({
  id: "response-43",
  content: "A concise generated answer.",
  provider: "OpenAI",
  model: "GPT 5.6 Sol",
});
assert.deepEqual(providerOnly.evidence, [
  {
    source: "ai://OpenAI/GPT%205.6%20Sol",
    label: "OpenAI / GPT 5.6 Sol",
  },
]);

assert.throws(
  () => teleprompterDocumentFromAIResponse({ id: "", content: "answer", provider: "p", model: "m" }),
  /id must be non-empty/,
);
assert.throws(
  () => teleprompterDocumentFromAIResponse({ id: "r", content: "   ", provider: "p", model: "m" }),
  /content must be non-empty/,
);

console.log("teleprompter AI handoff tests: PASS");
