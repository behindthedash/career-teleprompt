import type { TeleprompterDocument } from "./content.js";

export interface TeleprompterDocumentLifecycle {
  active: TeleprompterDocument | null;
  pending: TeleprompterDocument | null;
}

/**
 * Stage a newly generated answer without disturbing the active reading document.
 * Newer arrivals replace older pending guidance; the active document is never mutated.
 */
export function stagePendingGeneratedDocument(
  lifecycle: TeleprompterDocumentLifecycle,
  candidate: TeleprompterDocument,
): TeleprompterDocumentLifecycle {
  if (candidate.origin !== "generated") {
    throw new Error("only generated teleprompter documents may be staged as pending");
  }
  if (!lifecycle.active || lifecycle.active.id === candidate.id) {
    return lifecycle;
  }
  if (lifecycle.pending?.id === candidate.id) {
    return lifecycle;
  }
  return { active: lifecycle.active, pending: candidate };
}

/** Explicitly promote pending guidance to the active reading surface. */
export function activatePendingDocument(
  lifecycle: TeleprompterDocumentLifecycle,
): TeleprompterDocumentLifecycle {
  if (!lifecycle.pending) return lifecycle;
  return { active: lifecycle.pending, pending: null };
}

/** Discard pending guidance while preserving the active document and reading position. */
export function dismissPendingDocument(
  lifecycle: TeleprompterDocumentLifecycle,
): TeleprompterDocumentLifecycle {
  if (!lifecycle.pending) return lifecycle;
  return { active: lifecycle.active, pending: null };
}
