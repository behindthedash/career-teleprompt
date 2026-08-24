import { create } from "zustand";
import {
  loadPreparedDocument,
  promoteGeneratedDocumentToPrepared,
  type TeleprompterDocument,
  type TeleprompterFormat,
} from "../teleprompter/content";
import type { AlignmentResult, FollowerStatus } from "../teleprompter/follower";
import {
  activatePendingDocument as activatePendingLifecycle,
  dismissPendingDocument as dismissPendingLifecycle,
  stagePendingGeneratedDocument,
} from "../teleprompter/lifecycle";
import {
  loadTeleprompterPreferences,
  saveTeleprompterPreferences,
} from "../teleprompter/preferences";

type TeleprompterFollowerStatus = "idle" | FollowerStatus;

interface TeleprompterState {
  document: TeleprompterDocument | null;
  pendingDocument: TeleprompterDocument | null;
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
  saveCurrentAsPrepared: () => void;
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

  stagePendingDocument: (document: TeleprompterDocument) => void;
  activatePendingDocument: () => void;
  dismissPendingDocument: () => void;
}

const MIN_FONT_SIZE = 20;
const MAX_FONT_SIZE = 56;
const FONT_STEP = 2;
const initialPresentationPreferences = loadTeleprompterPreferences();

const followerReset = {
  cursorTokenIndex: 0,
  followerStatus: "idle" as const,
  followerConfidence: 0,
  recoveredOnLastUpdate: false,
};

export const useTeleprompterStore = create<TeleprompterState>((set, get) => ({
  document: null,
  pendingDocument: null,
  draftText: "",
  activeSectionIndex: 0,
  fontSize: initialPresentationPreferences.fontSize,
  lineHeight: initialPresentationPreferences.lineHeight,
  isEditing: true,

  followingEnabled: true,
  ...followerReset,

  setDraftText: (draftText) => set({ draftText }),

  setPreparedText: (text, format = "text", sourceUri = "prepared://overlay") => {
    const document = loadPreparedDocument(text, sourceUri, format);
    set({
      document,
      pendingDocument: null,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
      followingEnabled: true,
      ...followerReset,
    });
  },

  setDocument: (document) =>
    set({
      document,
      pendingDocument: null,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
      followingEnabled: true,
      ...followerReset,
    }),

  saveCurrentAsPrepared: () => {
    const current = get().document;
    if (!current || current.origin !== "generated") return;

    const document = promoteGeneratedDocumentToPrepared(current);
    set({
      document,
      draftText: document.sections.map((section) => section.displayText).join("\n\n"),
    });
  },

  clearDocument: () =>
    set({
      document: null,
      pendingDocument: null,
      draftText: "",
      activeSectionIndex: 0,
      isEditing: true,
      followingEnabled: true,
      ...followerReset,
    }),

  beginEditing: () => {
    const document = get().document;
    set({
      draftText: document
        ? document.sections.map((section) => section.displayText).join("\n\n")
        : get().draftText,
      isEditing: true,
      followingEnabled: false,
    });
  },

  cancelEditing: () => set({ isEditing: get().document === null }),

  setActiveSection: (index) => {
    const document = get().document;
    const count = document?.sections.length ?? 0;
    if (!document || count === 0) return;

    const activeSectionIndex = Math.max(0, Math.min(index, count - 1));
    set({
      activeSectionIndex,
      cursorTokenIndex: tokenStartForSection(document, activeSectionIndex),
      followingEnabled: false,
      followerStatus: "idle",
      followerConfidence: 0,
      recoveredOnLastUpdate: false,
    });
  },

  previousSection: () => get().setActiveSection(get().activeSectionIndex - 1),
  nextSection: () => get().setActiveSection(get().activeSectionIndex + 1),

  increaseFontSize: () => {
    const state = get();
    const preferences = saveTeleprompterPreferences({
      fontSize: Math.min(MAX_FONT_SIZE, state.fontSize + FONT_STEP),
      lineHeight: state.lineHeight,
    });
    set({ fontSize: preferences.fontSize });
  },
  decreaseFontSize: () => {
    const state = get();
    const preferences = saveTeleprompterPreferences({
      fontSize: Math.max(MIN_FONT_SIZE, state.fontSize - FONT_STEP),
      lineHeight: state.lineHeight,
    });
    set({ fontSize: preferences.fontSize });
  },
  setLineHeight: (lineHeight) => {
    const state = get();
    const preferences = saveTeleprompterPreferences({
      fontSize: state.fontSize,
      lineHeight,
    });
    set({ lineHeight: preferences.lineHeight });
  },

  setFollowingEnabled: (followingEnabled) =>
    set({
      followingEnabled,
      followerStatus: followingEnabled ? "uncertain" : "idle",
      followerConfidence: 0,
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
      followingEnabled: false,
      followerStatus: "idle",
      followerConfidence: 0,
      recoveredOnLastUpdate: false,
    });
  },

  resetFollower: () => set({ ...followerReset }),

  stagePendingDocument: (candidate) => {
    const state = get();
    if (state.isEditing) return;
    const lifecycle = stagePendingGeneratedDocument(
      { active: state.document, pending: state.pendingDocument },
      candidate,
    );
    if (lifecycle.pending !== state.pendingDocument) {
      set({ pendingDocument: lifecycle.pending });
    }
  },

  activatePendingDocument: () => {
    const state = get();
    const lifecycle = activatePendingLifecycle({
      active: state.document,
      pending: state.pendingDocument,
    });
    if (!lifecycle.active || lifecycle.active === state.document) return;

    set({
      document: lifecycle.active,
      pendingDocument: null,
      draftText: lifecycle.active.sections.map((section) => section.displayText).join("\n\n"),
      activeSectionIndex: 0,
      isEditing: false,
      followingEnabled: true,
      ...followerReset,
    });
  },

  dismissPendingDocument: () => {
    const state = get();
    const lifecycle = dismissPendingLifecycle({
      active: state.document,
      pending: state.pendingDocument,
    });
    if (lifecycle.pending !== state.pendingDocument) {
      set({ pendingDocument: lifecycle.pending });
    }
  },
}));

function documentTokenCount(document: TeleprompterDocument): number {
  return document.sections.reduce(
    (total, section) => total + section.matchText.split(" ").filter(Boolean).length,
    0,
  );
}

function tokenStartForSection(document: TeleprompterDocument, sectionIndex: number): number {
  let start = 0;
  for (let index = 0; index < sectionIndex; index += 1) {
    start += document.sections[index].matchText.split(" ").filter(Boolean).length;
  }
  return start;
}

function sectionIndexForTokenPosition(document: TeleprompterDocument, position: number): number {
  let consumed = 0;
  for (let index = 0; index < document.sections.length; index += 1) {
    consumed += document.sections[index].matchText.split(" ").filter(Boolean).length;
    if (position < consumed || index === document.sections.length - 1) return index;
  }
  return Math.max(0, document.sections.length - 1);
}
