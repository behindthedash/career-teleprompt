import type { TeleprompterDocument } from "./content";

export type FollowerStatus = "following" | "uncertain" | "lost";

export interface AlignmentOptions {
  maxSpokenTokens?: number;
  forwardWindow?: number;
  localThreshold?: number;
  recoveryThreshold?: number;
  lengthSlack?: number;
}

export interface AlignmentResult {
  /** Exclusive index of the last confidently consumed expected token. */
  position: number;
  confidence: number;
  status: FollowerStatus;
  recovered: boolean;
  spokenTokens: string[];
}

interface CandidateMatch {
  end: number;
  score: number;
  anchorBoost: number;
}

const DEFAULT_OPTIONS: Required<AlignmentOptions> = {
  maxSpokenTokens: 14,
  forwardWindow: 60,
  localThreshold: 0.62,
  recoveryThreshold: 0.78,
  lengthSlack: 4,
};

/** Flatten normalized section text into the monotonic token stream followed during speech. */
export function documentTokens(document: TeleprompterDocument): string[] {
  return document.sections.flatMap((section) =>
    section.matchText ? section.matchText.split(" ").filter(Boolean) : [],
  );
}

/** Normalize transcript text using the same speech-oriented rules as prepared content. */
export function transcriptTokens(text: string): string[] {
  const normalized = text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalized ? normalized.split(" ") : [];
}

/**
 * Fuzzy, monotonic alignment of the latest spoken transcript against prepared text.
 *
 * The follower intentionally consumes only the recent transcript tail. This makes it resilient
 * to interim STT corrections because NexQ replaces segment text in-place while this function
 * simply realigns the corrected tail. It never automatically moves the cursor backward.
 */
export function alignTranscript(
  expectedTokens: string[],
  transcript: string,
  previousPosition: number,
  options: AlignmentOptions = {},
): AlignmentResult {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const allSpoken = transcriptTokens(transcript);
  const spokenTokens = allSpoken.slice(-resolved.maxSpokenTokens);
  const previous = Math.max(0, Math.min(previousPosition, expectedTokens.length));

  if (spokenTokens.length < 2 || expectedTokens.length === 0) {
    return {
      position: previous,
      confidence: 0,
      status: "uncertain",
      recovered: false,
      spokenTokens,
    };
  }

  const localStart = Math.max(1, previous === 0 ? 1 : previous);
  const localEnd = Math.min(
    expectedTokens.length,
    Math.max(localStart, previous + resolved.forwardWindow),
  );
  let best = searchCandidateWindows(
    expectedTokens,
    spokenTokens,
    localStart,
    localEnd,
    previous,
    resolved.lengthSlack,
  );

  if (best.score >= resolved.localThreshold) {
    return {
      position: Math.max(previous, best.end),
      confidence: best.score,
      status: "following",
      recovered: false,
      spokenTokens,
    };
  }

  // A strong match well beyond the local reading window is treated as an intentional jump.
  // Four spoken words are enough only when they form a distinctive anchor that appears once
  // in the prepared document; otherwise recovery retains the safer five-token minimum.
  if (localEnd < expectedTokens.length && spokenTokens.length >= 4) {
    const recovery = searchCandidateWindows(
      expectedTokens,
      spokenTokens,
      localEnd + 1,
      expectedTokens.length,
      previous,
      resolved.lengthSlack,
    );
    const hasDistinctiveRecoveryAnchor = recovery.anchorBoost >= 0.08;
    const hasEnoughRecoveryEvidence =
      spokenTokens.length >= 5 || hasDistinctiveRecoveryAnchor;

    if (hasEnoughRecoveryEvidence && recovery.score >= resolved.recoveryThreshold) {
      return {
        position: Math.max(previous, recovery.end),
        confidence: recovery.score,
        status: "following",
        recovered: true,
        spokenTokens,
      };
    }
    if (recovery.score > best.score) best = recovery;
  }

  return {
    position: previous,
    confidence: best.score,
    status: best.score >= 0.4 ? "uncertain" : "lost",
    recovered: false,
    spokenTokens,
  };
}

function searchCandidateWindows(
  expectedTokens: string[],
  spokenTokens: string[],
  firstEnd: number,
  lastEnd: number,
  previousPosition: number,
  lengthSlack: number,
): CandidateMatch {
  let best: CandidateMatch = { end: previousPosition, score: 0, anchorBoost: 0 };

  for (let end = firstEnd; end <= lastEnd; end += 1) {
    const minLength = Math.max(2, spokenTokens.length - lengthSlack);
    const maxLength = Math.min(end, spokenTokens.length + lengthSlack);

    for (let length = minLength; length <= maxLength; length += 1) {
      const expectedWindow = expectedTokens.slice(end - length, end);
      const anchorBoost = distinctiveAnchorBoost(
        spokenTokens,
        expectedWindow,
        expectedTokens,
      );
      let score = Math.min(
        1,
        sequenceScore(spokenTokens, expectedWindow) + anchorBoost,
      );

      // Prefer the closest plausible continuation when a common phrase appears more than once.
      const expectedAdvance = Math.max(1, spokenTokens.length);
      const jump = Math.max(0, end - previousPosition - expectedAdvance);
      score -= Math.min(0.08, jump * 0.0008);

      if (
        score > best.score + Number.EPSILON ||
        (Math.abs(score - best.score) <= Number.EPSILON && end < best.end)
      ) {
        best = { end, score, anchorBoost };
      }
    }
  }

  return best;
}

/**
 * Confidence boost for an exact contiguous phrase that occurs only once in the prepared document.
 *
 * Exactness is intentional: fuzzy token matching already handles STT noise in sequenceScore. The
 * anchor exists only to break ambiguity when the speaker says a distinctive prepared phrase.
 * Repeated/common phrases receive no boost, so they continue to prefer the closest monotonic match.
 */
export function distinctiveAnchorBoost(
  spokenTokens: string[],
  expectedWindow: string[],
  documentExpectedTokens: string[],
): number {
  const maxAnchorLength = Math.min(
    5,
    spokenTokens.length,
    expectedWindow.length,
  );

  for (let length = maxAnchorLength; length >= 3; length -= 1) {
    for (let spokenStart = 0; spokenStart <= spokenTokens.length - length; spokenStart += 1) {
      const phrase = spokenTokens.slice(spokenStart, spokenStart + length);

      for (
        let expectedStart = 0;
        expectedStart <= expectedWindow.length - length;
        expectedStart += 1
      ) {
        let matches = true;
        for (let offset = 0; offset < length; offset += 1) {
          if (phrase[offset] !== expectedWindow[expectedStart + offset]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        if (countContiguousOccurrences(documentExpectedTokens, phrase) !== 1) {
          continue;
        }

        if (length >= 5) return 0.12;
        if (length === 4) return 0.1;
        return 0.06;
      }
    }
  }

  return 0;
}

function countContiguousOccurrences(tokens: string[], phrase: string[]): number {
  if (phrase.length === 0 || phrase.length > tokens.length) return 0;
  let count = 0;

  for (let start = 0; start <= tokens.length - phrase.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < phrase.length; offset += 1) {
      if (tokens[start + offset] !== phrase[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) count += 1;
    if (count > 1) return count;
  }

  return count;
}

/** Ordered fuzzy overlap score that tolerates filler words and omitted prepared words. */
export function sequenceScore(spokenTokens: string[], expectedTokens: string[]): number {
  if (spokenTokens.length === 0 || expectedTokens.length === 0) return 0;

  const rows = spokenTokens.length + 1;
  const columns = expectedTokens.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(columns).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      const similarity = tokenSimilarity(spokenTokens[i - 1], expectedTokens[j - 1]);
      dp[i][j] = Math.max(
        dp[i - 1][j],
        dp[i][j - 1],
        dp[i - 1][j - 1] + (similarity >= 0.68 ? similarity : 0),
      );
    }
  }

  const matchedWeight = dp[spokenTokens.length][expectedTokens.length];
  const precision = matchedWeight / spokenTokens.length;
  const recall = matchedWeight / expectedTokens.length;
  let score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const trailingSimilarity = tokenSimilarity(
    spokenTokens[spokenTokens.length - 1],
    expectedTokens[expectedTokens.length - 1],
  );
  if (trailingSimilarity >= 0.82) score = Math.min(1, score + 0.04);
  return score;
}

function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length <= 2 || right.length <= 2) return 0;
  const distance = levenshteinDistance(left, right);
  const similarity = 1 - distance / Math.max(left.length, right.length);
  return similarity >= 0.68 ? similarity : 0;
}

function levenshteinDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[right.length];
}
