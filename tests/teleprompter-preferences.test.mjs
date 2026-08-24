import assert from "node:assert/strict";
import {
  DEFAULT_TELEPROMPTER_PREFERENCES,
  TELEPROMPTER_PREFERENCES_KEY,
  loadTeleprompterPreferences,
  normalizeTeleprompterPreferences,
  saveTeleprompterPreferences,
} from "../.tmp-teleprompter-tests/preferences.js";

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

assert.deepEqual(normalizeTeleprompterPreferences(undefined), DEFAULT_TELEPROMPTER_PREFERENCES);
assert.deepEqual(
  normalizeTeleprompterPreferences({ fontSize: 999, lineHeight: 0.4 }),
  { fontSize: 56, lineHeight: 1.1 },
);
assert.deepEqual(
  normalizeTeleprompterPreferences({ fontSize: Number.NaN, lineHeight: Number.POSITIVE_INFINITY }),
  DEFAULT_TELEPROMPTER_PREFERENCES,
);

const storage = new MemoryStorage();
const saved = saveTeleprompterPreferences({ fontSize: 40, lineHeight: 1.75 }, storage);
assert.deepEqual(saved, { fontSize: 40, lineHeight: 1.75 });
assert.deepEqual(loadTeleprompterPreferences(storage), saved);
assert.equal(
  storage.getItem(TELEPROMPTER_PREFERENCES_KEY),
  JSON.stringify({ fontSize: 40, lineHeight: 1.75 }),
);

const corruptStorage = new MemoryStorage({
  [TELEPROMPTER_PREFERENCES_KEY]: "not-json",
});
assert.deepEqual(
  loadTeleprompterPreferences(corruptStorage),
  DEFAULT_TELEPROMPTER_PREFERENCES,
);

const partialStorage = new MemoryStorage({
  [TELEPROMPTER_PREFERENCES_KEY]: JSON.stringify({ fontSize: 36 }),
});
assert.deepEqual(loadTeleprompterPreferences(partialStorage), {
  fontSize: 36,
  lineHeight: DEFAULT_TELEPROMPTER_PREFERENCES.lineHeight,
});

console.log("teleprompter presentation preference tests: PASS");
