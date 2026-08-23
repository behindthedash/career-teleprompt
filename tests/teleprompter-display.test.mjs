import assert from "node:assert/strict";
import { loadPreparedDocument } from "../.tmp-teleprompter-tests/content.js";
import {
  buildDisplaySections,
  findReadingPieceIndex,
  pieceReadingState,
  sectionStartToken,
} from "../.tmp-teleprompter-tests/display.js";

const document = loadPreparedDocument(
  "# Intro\nI've built trusted systems.\n\n## Example\nA concrete AI example.",
  "file:///answers.md",
  "markdown",
);
const sections = buildDisplaySections(document);

assert.equal(sections.length, 2);
assert.equal(sections[0].tokenStart, 0);
// NFKC speech normalization turns "I've" into two tokens: "i ve".
assert.equal(sections[0].tokenEnd, 5);
assert.equal(sections[1].tokenStart, 5);
assert.equal(sectionStartToken(sections, 1), 5);

const firstTokenPiece = sections[0].pieces.find((piece) => piece.tokenBearing);
assert.ok(firstTokenPiece);
assert.equal(firstTokenPiece.text, "I've");
assert.equal(firstTokenPiece.tokenStart, 0);
assert.equal(firstTokenPiece.tokenEnd, 2);
assert.equal(pieceReadingState(firstTokenPiece, 0, 3), "current");
assert.equal(pieceReadingState(firstTokenPiece, 2, 3), "completed");

const nextIndex = findReadingPieceIndex(sections[0].pieces, 2);
assert.ok(nextIndex >= 0);
assert.equal(sections[0].pieces[nextIndex].text, "built");

const punctuation = sections[0].pieces.find((piece) => piece.text.includes(" "));
assert.ok(punctuation);
assert.equal(pieceReadingState(punctuation, 0), "separator");

console.log("teleprompter display tests: PASS");
