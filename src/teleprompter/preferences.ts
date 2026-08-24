export interface TeleprompterPresentationPreferences {
  fontSize: number;
  lineHeight: number;
  readingZonePercent: number;
}

export interface PreferenceReader {
  getItem(key: string): string | null;
}

export interface PreferenceWriter {
  setItem(key: string, value: string): void;
}

export const TELEPROMPTER_PREFERENCES_KEY =
  "career-teleprompt.teleprompter.presentation.v1";

export const DEFAULT_TELEPROMPTER_PREFERENCES: TeleprompterPresentationPreferences = {
  fontSize: 32,
  lineHeight: 1.5,
  readingZonePercent: 42,
};

const MIN_FONT_SIZE = 20;
const MAX_FONT_SIZE = 56;
const MIN_LINE_HEIGHT = 1.1;
const MAX_LINE_HEIGHT = 2.2;
const MIN_READING_ZONE_PERCENT = 30;
const MAX_READING_ZONE_PERCENT = 60;

export function normalizeTeleprompterPreferences(
  candidate: Partial<TeleprompterPresentationPreferences> | null | undefined,
): TeleprompterPresentationPreferences {
  return {
    fontSize: clampFinite(
      candidate?.fontSize,
      MIN_FONT_SIZE,
      MAX_FONT_SIZE,
      DEFAULT_TELEPROMPTER_PREFERENCES.fontSize,
    ),
    lineHeight: clampFinite(
      candidate?.lineHeight,
      MIN_LINE_HEIGHT,
      MAX_LINE_HEIGHT,
      DEFAULT_TELEPROMPTER_PREFERENCES.lineHeight,
    ),
    readingZonePercent: clampFinite(
      candidate?.readingZonePercent,
      MIN_READING_ZONE_PERCENT,
      MAX_READING_ZONE_PERCENT,
      DEFAULT_TELEPROMPTER_PREFERENCES.readingZonePercent,
    ),
  };
}

export function loadTeleprompterPreferences(
  storage: PreferenceReader | null = browserStorage(),
): TeleprompterPresentationPreferences {
  if (!storage) return { ...DEFAULT_TELEPROMPTER_PREFERENCES };

  try {
    const serialized = storage.getItem(TELEPROMPTER_PREFERENCES_KEY);
    if (!serialized) return { ...DEFAULT_TELEPROMPTER_PREFERENCES };
    const parsed = JSON.parse(serialized) as Partial<TeleprompterPresentationPreferences>;
    return normalizeTeleprompterPreferences(parsed);
  } catch {
    return { ...DEFAULT_TELEPROMPTER_PREFERENCES };
  }
}

export function saveTeleprompterPreferences(
  preferences: Partial<TeleprompterPresentationPreferences>,
  storage: PreferenceWriter | null = browserStorage(),
): TeleprompterPresentationPreferences {
  const normalized = normalizeTeleprompterPreferences(preferences);
  if (!storage) return normalized;

  try {
    storage.setItem(TELEPROMPTER_PREFERENCES_KEY, JSON.stringify(normalized));
  } catch {
    // Presentation preferences are convenience state. Storage failures must never
    // interfere with the live teleprompter or speech-following path.
  }
  return normalized;
}

function browserStorage(): (PreferenceReader & PreferenceWriter) | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

function clampFinite(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(value, max));
}
