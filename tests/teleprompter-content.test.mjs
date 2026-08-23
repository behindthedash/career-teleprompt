import assert from "node:assert/strict";
import {
  cleanDisplayText,
  generatedDocumentFromResponse,
  loadPreparedDocument,
  normalizeMatchText,
} from "../.tmp-teleprompter-tests/content.js";

assert.equal(normalizeMatchText("  HéLLo—WORLD!  42  "), "héllo world 42");
assert.equal(normalizeMatchText("Ｆｕｌｌｗｉｄｔｈ １２３"), "fullwidth 123");
assert.equal(
  cleanDisplayText(" first  \r\n\r\n\r\n\r\nsecond\t \n"),
  "first\n\nsecond",
);

const plain = loadPreparedDocument("My prepared answer.", "file:///answer.txt");
assert.equal(plain.origin, "prepared");
assert.equal(plain.ephemeral, false);
assert.equal(plain.sections.length, 1);
assert.equal(plain.sections[0].matchText, "my prepared answer");

const markdown = loadPreparedDocument(
  "Intro before heading\n\n# Why this role\nI like the role.\n\n## Example\nA concrete example.",
  "file:///answers.md",
  "markdown",
);
assert.deepEqual(markdown.sections.map((section) => section.ordinal), [0, 1, 2]);
assert.equal(markdown.sections[0].displayText, "Intro before heading");
assert.equal(markdown.sections[1].title, "Why this role");
assert.equal(markdown.sections[2].title, "Example");
assert.equal(markdown.sections[2].matchText, "a concrete example");

const same = loadPreparedDocument("My prepared answer.", "file:///answer.txt");
assert.equal(same.id, plain.id);
assert.equal(same.sections[0].id, plain.sections[0].id);

const generated = generatedDocumentFromResponse({
  text: "Use this grounded answer.",
  responseSessionId: "session-1",
  queryGeneration: 2,
  evidence: [{ source: "resume.pdf", label: "Resume" }],
});
assert.equal(generated.origin, "generated");
assert.equal(generated.ephemeral, true);
assert.equal(generated.sourceUri, "response://session-1/2");
assert.equal(generated.evidence?.length, 1);

assert.throws(
  () => loadPreparedDocument("   ", "file:///blank.txt"),
  /at least one section/,
);
assert.throws(() => loadPreparedDocument("answer", "  "), /sourceUri/);
assert.throws(
  () =>
    generatedDocumentFromResponse({
      text: "answer",
      responseSessionId: "s",
      queryGeneration: 0,
      evidence: [{ source: "x" }],
    }),
  /positive integer/,
);
assert.throws(
  () =>
    generatedDocumentFromResponse({
      text: "answer",
      responseSessionId: "s",
      queryGeneration: 1,
      evidence: [],
    }),
  /requires evidence/,
);

console.log("teleprompter content tests: PASS");
