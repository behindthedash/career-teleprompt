import { normalizeMatchText, type TeleprompterDocument, type TeleprompterSection } from "./content.js";

export interface TeleprompterDisplayPiece {
  text: string;
  tokenStart: number;
  tokenEnd: number;
  tokenBearing: boolean;
}

export interface TeleprompterDisplaySection {
  section: TeleprompterSection;
  tokenStart: number;
  tokenEnd: number;
  pieces: TeleprompterDisplayPiece[];
}

const DISPLAY_PIECE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu;

/** Map authored display text to the normalized token coordinates used by the speech follower. */
export function buildDisplaySections(document: TeleprompterDocument): TeleprompterDisplaySection[] {
  let globalToken = 0;

  return document.sections.map((section) => {
    const sectionStart = globalToken;
    const pieces: TeleprompterDisplayPiece[] = [];

    for (const match of section.displayText.matchAll(DISPLAY_PIECE)) {
      const text = match[0];
      const normalized = normalizeMatchText(text);
      const tokenCount = normalized ? normalized.split(" ").filter(Boolean).length : 0;
      const tokenStart = globalToken;
      globalToken += tokenCount;
      pieces.push({
        text,
        tokenStart,
        tokenEnd: globalToken,
        tokenBearing: tokenCount > 0,
      });
    }

    return {
      section,
      tokenStart: sectionStart,
      tokenEnd: globalToken,
      pieces,
    };
  });
}

export function sectionStartToken(
  sections: TeleprompterDisplaySection[],
  sectionIndex: number,
): number {
  if (sections.length === 0) return 0;
  const clamped = Math.max(0, Math.min(sectionIndex, sections.length - 1));
  return sections[clamped].tokenStart;
}

/** Parse a token coordinate emitted by the reading surface's data attributes. */
export function parseSeekToken(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const token = Number(value);
  return Number.isInteger(token) && token >= 0 ? token : null;
}

export function findReadingPieceIndex(
  pieces: TeleprompterDisplayPiece[],
  cursorTokenIndex: number,
): number {
  if (pieces.length === 0) return -1;
  const next = pieces.findIndex(
    (piece) => piece.tokenBearing && piece.tokenEnd > cursorTokenIndex,
  );
  if (next >= 0) return next;

  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    if (pieces[index].tokenBearing) return index;
  }
  return -1;
}

export type PieceReadingState = "completed" | "current" | "upcoming" | "separator";

export function pieceReadingState(
  piece: TeleprompterDisplayPiece,
  cursorTokenIndex: number,
  currentWindowTokens = 6,
): PieceReadingState {
  if (!piece.tokenBearing) return "separator";
  if (piece.tokenEnd <= cursorTokenIndex) return "completed";
  if (piece.tokenStart < cursorTokenIndex + currentWindowTokens) return "current";
  return "upcoming";
}
