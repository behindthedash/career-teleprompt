export type TeleprompterOrigin = "prepared" | "generated";
export type TeleprompterFormat = "text" | "markdown";

export interface TeleprompterEvidence {
  source: string;
  label?: string;
}

export interface TeleprompterSection {
  id: string;
  ordinal: number;
  sourceUri: string;
  displayText: string;
  matchText: string;
  title?: string;
}

export interface TeleprompterDocument {
  id: string;
  origin: TeleprompterOrigin;
  sourceUri: string;
  sections: TeleprompterSection[];
  responseSessionId?: string;
  queryGeneration?: number;
  evidence?: TeleprompterEvidence[];
  ephemeral: boolean;
}

export interface GeneratedDocumentInput {
  text: string;
  responseSessionId: string;
  queryGeneration: number;
  evidence: TeleprompterEvidence[];
}

const MARKDOWN_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

/** Normalize display content into speech-matching text without changing what the user sees. */
export function normalizeMatchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Keep authored line structure while removing incidental whitespace and excessive blank lines. */
export function cleanDisplayText(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
  return lines.join("\n").trim().replace(/\n{3,}/g, "\n\n");
}

/** Convert user-owned text/Markdown into stable ordered teleprompter sections. */
export function loadPreparedDocument(
  text: string,
  sourceUri: string,
  format: TeleprompterFormat = "text",
): TeleprompterDocument {
  requireNonEmpty(sourceUri, "sourceUri");
  const rawSections =
    format === "markdown"
      ? splitMarkdownSections(text)
      : [{ displayText: cleanDisplayText(text) }];
  const sections = buildSections(sourceUri, rawSections);
  if (sections.length === 0) {
    throw new Error("teleprompter document must contain at least one section");
  }

  return {
    id: stableId("prepared", sourceUri, sections.map((section) => section.matchText).join("\n")),
    origin: "prepared",
    sourceUri,
    sections,
    ephemeral: false,
  };
}

/** Project an AI-generated answer into ephemeral teleprompter content with provenance. */
export function generatedDocumentFromResponse(input: GeneratedDocumentInput): TeleprompterDocument {
  requireNonEmpty(input.responseSessionId, "responseSessionId");
  if (!Number.isInteger(input.queryGeneration) || input.queryGeneration <= 0) {
    throw new Error("queryGeneration must be a positive integer");
  }
  if (input.evidence.length === 0) {
    throw new Error("generated document requires evidence");
  }

  const sourceUri = `response://${input.responseSessionId}/${input.queryGeneration}`;
  const sections = buildSections(sourceUri, [{ displayText: cleanDisplayText(input.text) }]);
  if (sections.length === 0) {
    throw new Error("teleprompter document must contain at least one section");
  }

  return {
    id: stableId("generated", sourceUri, sections.map((section) => section.matchText).join("\n")),
    origin: "generated",
    sourceUri,
    sections,
    responseSessionId: input.responseSessionId,
    queryGeneration: input.queryGeneration,
    evidence: input.evidence.map((item) => ({ ...item })),
    ephemeral: true,
  };
}

function splitMarkdownSections(text: string): Array<{ title?: string; displayText: string }> {
  const sections: Array<{ title?: string; displayText: string }> = [];
  let currentTitle: string | undefined;
  let body: string[] = [];

  const flush = () => {
    const displayText = cleanDisplayText(body.join("\n"));
    if (displayText || currentTitle) {
      sections.push({
        ...(currentTitle ? { title: currentTitle } : {}),
        displayText: displayText || currentTitle || "",
      });
    }
    body = [];
  };

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const match = line.match(MARKDOWN_HEADING);
    if (match) {
      flush();
      currentTitle = cleanDisplayText(match[1]);
    } else {
      body.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    return [{ displayText: cleanDisplayText(text) }];
  }
  return sections;
}

function buildSections(
  sourceUri: string,
  raw: Array<{ title?: string; displayText: string }>,
): TeleprompterSection[] {
  const sections: TeleprompterSection[] = [];

  for (const item of raw) {
    const displayText = cleanDisplayText(item.displayText);
    const matchText = normalizeMatchText(displayText);
    if (!displayText || !matchText) continue;

    const ordinal = sections.length;
    sections.push({
      id: stableId(sourceUri, String(ordinal), item.title ?? "", matchText),
      ordinal,
      sourceUri,
      displayText,
      matchText,
      ...(item.title ? { title: item.title } : {}),
    });
  }

  return sections;
}

function requireNonEmpty(value: string, name: string): void {
  if (!value.trim()) throw new Error(`${name} must be non-empty`);
}

function stableId(...parts: string[]): string {
  // FNV-1a 64-bit gives deterministic browser-safe content IDs. These IDs are
  // identity hints, not a cryptographic integrity primitive.
  let hash = 0xcbf29ce484222325n;
  for (const codePoint of parts.join("\u001f")) {
    hash ^= BigInt(codePoint.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
