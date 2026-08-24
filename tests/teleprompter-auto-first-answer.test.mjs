import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/stores/streamStore.ts", "utf8");

assert.match(source, /response\.mode === "WhatToSay"/);
assert.match(source, /if \(!teleprompter\.document\)/);
assert.match(source, /teleprompter\.setDocument\(document\)/);
assert.match(source, /setLayoutMode\("teleprompt"\)/);
assert.match(source, /else if \(!teleprompter\.isEditing\)/);
assert.match(source, /teleprompter\.stagePendingDocument\(document\)/);

const firstActivation = source.indexOf("teleprompter.setDocument(document)");
const pendingStage = source.indexOf("teleprompter.stagePendingDocument(document)");
assert.ok(firstActivation >= 0 && pendingStage > firstActivation, "empty teleprompter activation must be evaluated before pending staging");

console.log("automatic first-answer teleprompter handoff contract passed");
