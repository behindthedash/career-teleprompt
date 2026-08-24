import type { TeleprompterFormat } from "./content";

export function inferTeleprompterFormatFromPath(filePath: string): TeleprompterFormat {
  const normalized = filePath.trim().toLowerCase();
  return normalized.endsWith(".md") || normalized.endsWith(".markdown")
    ? "markdown"
    : "text";
}

export function preparedFileSourceUri(filePath: string): string {
  const normalized = filePath.trim();
  if (!normalized) {
    throw new Error("Prepared teleprompter file path is required");
  }
  return `prepared-file://${encodeURIComponent(normalized)}`;
}
