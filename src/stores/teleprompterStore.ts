import { create } from "zustand";
import {
  loadPreparedDocument,
  type TeleprompterDocument,
  type TeleprompterFormat,
} from "../teleprompter/content";

interface TeleprompterState {
  document: TeleprompterDocument | null;
  draftText: string;
  activeSectionIndex: number;
  fontSize: number;
  lineHeight: number;
  isEditing: boolean;

  setDraftText: (text: string) => void;
  setPreparedText: (text: string, format?: TeleprompterFormat, sourceUri?: string) => void;
  setDocument: (document: TeleprompterDocument) => void;
  clearDocument: () => void;
  beginEditing: () => void;
  cancelEditing: () => void;
  setActiveSection: (index: number) => void;
  previousSection: () => void;
  nextSection: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setLineHeight: (lineHeight: number) => void;
}

const MIN_FONT_SIZE = 20;
const MAX_FONT_SIZE = 56;
const FONT_STEP = 2;

export const useTeleprompterStore = create<TeleprompterState>((set, get) => ({
  document: null,
  draftText: "",
  activeSectionIndex: 0,
  fontSize: 32,
  lineHeight: 1.5,
  isEditing: true,

  setDraftText: (draftText) => set({ draftText }),

  setPreparedText: (text, format = "text", sourceUri = "prepared://overlay") => {
    const document = loadPreparedDocument(text, sourceUri, format);
    set({
      document,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
    });
  },

  setDocument: (document) =>
    set({
      document,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
    }),

  clearDocument: () =>
    set({
      document: null,
      draftText: "",
      activeSectionIndex: 0,
      isEditing: true,
    }),

  beginEditing: () => {
    const document = get().document;
    set({
      draftText: document
        ? document.sections.map((section) => section.displayText).join("\n\n")
        : get().draftText,
      isEditing: true,
    });
  },

  cancelEditing: () => set({ isEditing: get().document === null }),

  setActiveSection: (index) => {
    const count = get().document?.sections.length ?? 0;
    if (count === 0) return;
    set({ activeSectionIndex: Math.max(0, Math.min(index, count - 1)) });
  },

  previousSection: () => get().setActiveSection(get().activeSectionIndex - 1),
  nextSection: () => get().setActiveSection(get().activeSectionIndex + 1),

  increaseFontSize: () => set({ fontSize: Math.min(MAX_FONT_SIZE, get().fontSize + FONT_STEP) }),
  decreaseFontSize: () => set({ fontSize: Math.max(MIN_FONT_SIZE, get().fontSize - FONT_STEP) }),
  setLineHeight: (lineHeight) => set({ lineHeight: Math.max(1.1, Math.min(lineHeight, 2.2)) }),
}));
