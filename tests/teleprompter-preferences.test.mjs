import assert from "node:assert/strict";
import fs from "node:fs";
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
  normalizeTeleprompterPreferences({
    fontSize: 999,
    lineHeight: 0.4,
    readingZonePercent: 99,
  }),
  { fontSize: 56, lineHeight: 1.1, readingZonePercent: 60 },
);
assert.deepEqual(
  normalizeTeleprompterPreferences({
    fontSize: Number.NaN,
    lineHeight: Number.POSITIVE_INFINITY,
    readingZonePercent: Number.NaN,
  }),
  DEFAULT_TELEPROMPTER_PREFERENCES,
);

const storage = new MemoryStorage();
const saved = saveTeleprompterPreferences(
  { fontSize: 40, lineHeight: 1.75, readingZonePercent: 50 },
  storage,
);
assert.deepEqual(saved, { fontSize: 40, lineHeight: 1.75, readingZonePercent: 50 });
assert.deepEqual(loadTeleprompterPreferences(storage), saved);
assert.equal(
  storage.getItem(TELEPROMPTER_PREFERENCES_KEY),
  JSON.stringify({ fontSize: 40, lineHeight: 1.75, readingZonePercent: 50 }),
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
  readingZonePercent: DEFAULT_TELEPROMPTER_PREFERENCES.readingZonePercent,
});

const panelSource = fs.readFileSync("src/overlay/TeleprompterPanel.tsx", "utf8");
assert.match(panelSource, /const readingZonePercent = useTeleprompterStore/);
assert.match(panelSource, /container\.clientHeight \* \(readingZonePercent \/ 100\)/);
assert.match(panelSource, /style=\{\{ top: `\$\{readingZonePercent\}%` \}\}/);
assert.match(panelSource, /style=\{\{ height: `\$\{readingZonePercent\}%` \}\}/);
assert.match(panelSource, /style=\{\{ height: `\$\{100 - readingZonePercent\}%` \}\}/);
assert.doesNotMatch(panelSource, /clientHeight \* 0\.42/);

console.log("teleprompter presentation preference tests: PASS");
