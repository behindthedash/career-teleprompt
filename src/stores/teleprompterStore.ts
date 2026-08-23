import { create } from "zustand";
import {
  loadPreparedDocument,
  type TeleprompterDocument,
  type TeleprompterFormat,
} from "../teleprompter/content";
import type { AlignmentResult, FollowerStatus } from "../teleprompter/follower";

type TeleprompterFollowerStatus = "idle" | FollowerStatus;

interface TeleprompterState {
  document: TeleprompterDocument | null;
  draftText: string;
  activeSectionIndex: number;
  fontSize: number;
  lineHeight: number;
  isEditing: boolean;

  followingEnabled: boolean;
  cursorTokenIndex: number;
  followerStatus: TeleprompterFollowerStatus;
  followerConfidence: number;
  recoveredOnLastUpdate: boolean;

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

  setFollowingEnabled: (enabled: boolean) => void;
  applyFollowerAlignment: (result: AlignmentResult) => void;
  seekToken: (position: number) => void;
  resetFollower: () => void;
}

const MIN_FONT_SIZE = 20;
const MAX_FONT_SIZE = 56;
const FONT_STEP = 2;

const followerReset = {
  cursorTokenIndex: 0,
  followerStatus: "idle" as const,
  followerConfidence: 0,
  recoveredOnLastUpdate: false,
};

export const useTeleprompterStore = create<TeleprompterState>((set, get) => ({
  document: null,
  draftText: "",
  activeSectionIndex: 0,
  fontSize: 32,
  lineHeight: 1.5,
  isEditing: true,

  followingEnabled: true,
  ...followerReset,

  setDraftText: (draftText) => set({ draftText }),

  setPreparedText: (text, format = "text", sourceUri = "prepared://overlay") => {
    const document = loadPreparedDocument(text, sourceUri, format);
    set({
      document,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
      ...followerReset,
    });
  },

  setDocument: (document) =>
    set({
      document,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
      ...followerReset,
    }),

  clearDocument: () =>
    set({
      document: null,
      draftText: "",
      activeSectionIndex: 0,
      isEditing: true,
      ...followerReset,
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

  setFollowingEnabled: (followingEnabled) =>
    set({
      followingEnabled,
      followerStatus: followingEnabled ? get().followerStatus : "idle",
      followerConfidence: followingEnabled ? get().followerConfidence : 0,
      recoveredOnLastUpdate: false,
    }),

  applyFollowerAlignment: (result) => {
    const document = get().document;
    const activeSectionIndex = document
      ? sectionIndexForTokenPosition(document, result.position)
      : get().activeSectionIndex;
    set({
      cursorTokenIndex: result.position,
      followerStatus: result.status,
      followerConfidence: result.confidence,
      recoveredOnLastUpdate: result.recovered,
      activeSectionIndex,
    });
  },

  seekToken: (position) => {
    const document = get().document;
    const totalTokens = document ? documentTokenCount(document) : 0;
    const cursorTokenIndex = Math.max(0, Math.min(position, totalTokens));
    set({
      cursorTokenIndex,
      activeSectionIndex: document
        ? sectionIndexForTokenPosition(document, cursorTokenIndex)
        : get().activeSectionIndex,
      followerStatus: "idle",
      followerConfidence: 0,
      recoveredOnLastUpdate: false,
    });
  },

  resetFollower: () => set({ ...followerReset }),
}));

function documentTokenCount(document: TeleprompterDocument): number {
  return document.sections.reduce(
    (total, section) => total + section.matchText.split(" ").filter(Boolean).length,
    0,
  );
}

function sectionIndexForTokenPosition(document: TeleprompterDocument, position: number): number {
  let consumed = 0;
  for (let index = 0; index < document.sections.length; index += 1) {
    consumed += document.sections[index].matchText.split(" ").filter(Boolean).length;
    if (position <= consumed) return index;
  }
  return Math.max(0, document.sections.length - 1);
}
