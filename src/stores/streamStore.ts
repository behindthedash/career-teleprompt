import { create } from "zustand";
import type { AIResponse, IntelligenceMode, StreamSource } from "../lib/types";
import { stripThinkTags } from "../lib/utils";
import { teleprompterDocumentFromAIResponse } from "../teleprompter/handoff";
import { useOverlayLayoutStore } from "./overlayLayoutStore";
import { useTeleprompterStore } from "./teleprompterStore";

interface StreamState {
  // Current stream
  isStreaming: boolean;
  currentContent: string;
  _rawContent: string; // unfiltered content (includes <think> tags)
  currentMode: IntelligenceMode | null;
  currentModel: string;
  currentProvider: string;
  currentSources: StreamSource[];
  error: string | null;
  latencyMs: number | null;

  // Response history (last 3) + pinned responses
  responseHistory: AIResponse[];
  pinnedResponses: AIResponse[];

  // Actions
  setStreaming: (streaming: boolean) => void;
  appendToken: (token: string) => void;
  startStream: (mode: IntelligenceMode, model: string, provider: string) => void;
  setSources: (sources: StreamSource[]) => void;
  endStream: (latencyMs: number) => void;
  setError: (error: string | null) => void;
  clearCurrent: () => void;
  pinResponse: (id: string) => void;
  unpinResponse: (id: string) => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  isStreaming: false,
  currentContent: "",
  _rawContent: "",
  currentMode: null,
  currentModel: "",
  currentProvider: "",
  currentSources: [],
  error: null,
  latencyMs: null,
  responseHistory: [],
  pinnedResponses: [],

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  appendToken: (token) =>
    set((state) => {
      const raw = state._rawContent + token;
      return {
        _rawContent: raw,
        currentContent: stripThinkTags(raw),
      };
    }),

  startStream: (mode, model, provider) =>
    set({
      isStreaming: true,
      currentContent: "",
      _rawContent: "",
      currentMode: mode,
      currentModel: model,
      currentProvider: provider,
      currentSources: [],
      error: null,
      latencyMs: null,
    }),

  setSources: (sources) => set({ currentSources: sources }),

  endStream: (latencyMs) => {
    const state = get();
    // Strip <think> tags from the final stored content
    const content = stripThinkTags(state._rawContent);
    const response: AIResponse = {
      id: crypto.randomUUID(),
      content,
      mode: state.currentMode!,
      timestamp: Date.now(),
      pinned: false,
      model: state.currentModel,
      provider: state.currentProvider,
      latency_ms: latencyMs,
      sources: state.currentSources.length > 0 ? state.currentSources : undefined,
    };

    set((s) => ({
      isStreaming: false,
      currentContent: content,
      latencyMs,
      responseHistory: [response, ...s.responseHistory].slice(0, 5),
    }));

    // Completed interview guidance enters the teleprompter lifecycle automatically:
    // the first answer may activate an empty teleprompter, but a later answer must
    // never displace text the user is already reading or editing.
    if (response.mode === "WhatToSay" && content.trim()) {
      try {
        const document = teleprompterDocumentFromAIResponse(response);
        const teleprompter = useTeleprompterStore.getState();

        if (!teleprompter.document) {
          teleprompter.setDocument(document);
          useOverlayLayoutStore.getState().setLayoutMode("teleprompt");
        } else if (!teleprompter.isEditing) {
          teleprompter.stagePendingDocument(document);
        }
      } catch (error) {
        console.warn("Failed to hand generated interview answer to teleprompter", error);
      }
    }
  },

  setError: (error) => set({ error, isStreaming: false }),
  clearCurrent: () =>
    set({ currentContent: "", _rawContent: "", currentMode: null, currentModel: "", currentProvider: "", currentSources: [], error: null, latencyMs: null }),

  pinResponse: (id) => {
    const state = get();
    const response = state.responseHistory.find((r) => r.id === id);
    if (response && !state.pinnedResponses.find((r) => r.id === id)) {
      set({
        pinnedResponses: [
          ...state.pinnedResponses,
          { ...response, pinned: true },
        ],
      });
    }
  },

  unpinResponse: (id) =>
    set((state) => ({
      pinnedResponses: state.pinnedResponses.filter((r) => r.id !== id,
      ),
    })),
}));
