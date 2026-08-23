import {
  generatedDocumentFromResponse,
  type TeleprompterDocument,
  type TeleprompterEvidence,
} from "./content.js";

export interface TeleprompterAIResponseSource {
  title: string;
  url: string;
}

export interface TeleprompterAIResponse {
  id: string;
  content: string;
  provider: string;
  model: string;
  sources?: TeleprompterAIResponseSource[];
}

export interface PromptableTeleprompterAIResponse extends TeleprompterAIResponse {
  mode: string;
}

/** Only completed What to Say answers should take over the interview teleprompter. */
export function isPromptableAIResponse(response: PromptableTeleprompterAIResponse): boolean {
  return response.mode === "WhatToSay" && response.content.trim().length > 0;
}

/**
 * Convert a completed AI answer into ephemeral speech-followable teleprompter content.
 *
 * Retrieval/web sources are preserved when present. Otherwise the generating provider/model
 * becomes explicit provenance so generated content never masquerades as user-authored material.
 */
export function teleprompterDocumentFromAIResponse(
  response: TeleprompterAIResponse,
): TeleprompterDocument {
  if (!response.id.trim()) throw new Error("AI response id must be non-empty");
  if (!response.content.trim()) throw new Error("AI response content must be non-empty");

  const evidence = response.sources?.length
    ? response.sources.map<TeleprompterEvidence>((source) => ({
        source: source.url,
        label: source.title,
      }))
    : [generationEvidence(response.provider, response.model)];

  return generatedDocumentFromResponse({
    text: response.content,
    responseSessionId: response.id,
    queryGeneration: 1,
    evidence,
  });
}

function generationEvidence(provider: string, model: string): TeleprompterEvidence {
  const cleanProvider = provider.trim() || "unknown-provider";
  const cleanModel = model.trim() || "unknown-model";
  return {
    source: `ai://${encodeURIComponent(cleanProvider)}/${encodeURIComponent(cleanModel)}`,
    label: `${cleanProvider} / ${cleanModel}`,
  };
}
