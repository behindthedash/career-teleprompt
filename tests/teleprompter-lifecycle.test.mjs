import assert from "node:assert/strict";
import {
  activatePendingDocument,
  dismissPendingDocument,
  stagePendingGeneratedDocument,
} from "../.tmp-teleprompter-tests/lifecycle.js";
import {
  generatedDocumentFromResponse,
  loadPreparedDocument,
} from "../.tmp-teleprompter-tests/content.js";

const prepared = loadPreparedDocument("Prepared answer", "file:///prepared.txt");
const generated1 = generatedDocumentFromResponse({
  text: "First generated answer",
  responseSessionId: "response-1",
  queryGeneration: 1,
  evidence: [{ source: "rag://resume" }],
});
const generated2 = generatedDocumentFromResponse({
  text: "Newer generated answer",
  responseSessionId: "response-2",
  queryGeneration: 1,
  evidence: [{ source: "rag://resume" }],
});

const initial = { active: prepared, pending: null };
const staged = stagePendingGeneratedDocument(initial, generated1);
assert.equal(staged.active.id, prepared.id);
assert.equal(staged.pending.id, generated1.id);
assert.equal(staged.active, initial.active, "staging must preserve active document identity");

const superseded = stagePendingGeneratedDocument(staged, generated2);
assert.equal(superseded.active.id, prepared.id);
assert.equal(superseded.pending.id, generated2.id, "newer pending guidance should supersede older pending guidance");

const activated = activatePendingDocument(superseded);
assert.equal(activated.active.id, generated2.id);
assert.equal(activated.pending, null);

const dismissed = dismissPendingDocument(staged);
assert.equal(dismissed.active.id, prepared.id);
assert.equal(dismissed.pending, null);

assert.equal(activatePendingDocument(initial), initial, "activating without pending guidance is a no-op");
assert.equal(dismissPendingDocument(initial), initial, "dismissing without pending guidance is a no-op");
assert.equal(
  stagePendingGeneratedDocument({ active: null, pending: null }, generated1).active,
  null,
  "pending guidance should not create an active document implicitly",
);
assert.throws(
  () => stagePendingGeneratedDocument(initial, prepared),
  /only generated teleprompter documents/,
);

console.log("teleprompter lifecycle tests: PASS");
