import { useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useTeleprompterFollower } from "../hooks/useTeleprompterFollower";
import { useTeleprompterStore } from "../stores/teleprompterStore";
import type { TeleprompterFormat } from "../teleprompter/content";
import {
  buildDisplaySections,
  findReadingPieceIndex,
  pieceReadingState,
} from "../teleprompter/display";
import {
  inferTeleprompterFormatFromPath,
  preparedFileSourceUri,
} from "../teleprompter/fileImport";

export function TeleprompterPanel() {
  useTeleprompterFollower();

  const document = useTeleprompterStore((state) => state.document);
  const pendingDocument = useTeleprompterStore((state) => state.pendingDocument);
  const draftText = useTeleprompterStore((state) => state.draftText);
  const activeSectionIndex = useTeleprompterStore((state) => state.activeSectionIndex);
  const cursorTokenIndex = useTeleprompterStore((state) => state.cursorTokenIndex);
  const fontSize = useTeleprompterStore((state) => state.fontSize);
  const lineHeight = useTeleprompterStore((state) => state.lineHeight);
  const isEditing = useTeleprompterStore((state) => state.isEditing);
  const followerStatus = useTeleprompterStore((state) => state.followerStatus);
  const followerConfidence = useTeleprompterStore((state) => state.followerConfidence);
  const recoveredOnLastUpdate = useTeleprompterStore((state) => state.recoveredOnLastUpdate);
  const followingEnabled = useTeleprompterStore((state) => state.followingEnabled);
  const setDraftText = useTeleprompterStore((state) => state.setDraftText);
  const setPreparedText = useTeleprompterStore((state) => state.setPreparedText);
  const saveCurrentAsPrepared = useTeleprompterStore((state) => state.saveCurrentAsPrepared);
  const clearDocument = useTeleprompterStore((state) => state.clearDocument);
  const beginEditing = useTeleprompterStore((state) => state.beginEditing);
  const cancelEditing = useTeleprompterStore((state) => state.cancelEditing);
  const previousSection = useTeleprompterStore((state) => state.previousSection);
  const nextSection = useTeleprompterStore((state) => state.nextSection);
  const increaseFontSize = useTeleprompterStore((state) => state.increaseFontSize);
  const decreaseFontSize = useTeleprompterStore((state) => state.decreaseFontSize);
  const setLineHeight = useTeleprompterStore((state) => state.setLineHeight);
  const setFollowingEnabled = useTeleprompterStore((state) => state.setFollowingEnabled);
  const setActiveSection = useTeleprompterStore((state) => state.setActiveSection);
  const activatePendingDocument = useTeleprompterStore((state) => state.activatePendingDocument);
  const dismissPendingDocument = useTeleprompterStore((state) => state.dismissPendingDocument);

  const [format, setFormat] = useState<TeleprompterFormat>("text");
  const [draftSourceUri, setDraftSourceUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const readingPieceRef = useRef<HTMLSpanElement | null>(null);

  const displaySections = useMemo(
    () => (document ? buildDisplaySections(document) : []),
    [document],
  );
  const activeDisplaySection = displaySections[activeSectionIndex];
  const readingPieceIndex = activeDisplaySection
    ? findReadingPieceIndex(activeDisplaySection.pieces, cursorTokenIndex)
    : -1;

  useEffect(() => {
    if (isEditing) return;
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      const target = readingPieceRef.current;
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const desiredTop =
        container.scrollTop +
        (targetRect.top - containerRect.top) -
        container.clientHeight * 0.42;
      container.scrollTo({ top: Math.max(0, desiredTop), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSectionIndex, cursorTokenIndex, isEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;
      if (event.key === "PageUp") {
        event.preventDefault();
        previousSection();
      } else if (event.key === "PageDown") {
        event.preventDefault();
        nextSection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextSection, previousSection]);

  const applyDraft = () => {
    try {
      setPreparedText(
        draftText,
        format,
        draftSourceUri ?? "prepared://overlay",
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load teleprompter script");
    }
  };

  const openPreparedFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Teleprompter Scripts",
            extensions: ["txt", "md", "markdown"],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return;

      const text = await readTextFile(selected);
      if (!text.trim()) {
        throw new Error("Selected teleprompter script is empty");
      }

      setDraftText(text);
      setFormat(inferTeleprompterFormatFromPath(selected));
      setDraftSourceUri(preparedFileSourceUri(selected));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open teleprompter script");
    }
  };

  if (isEditing || !document) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card/20">
        <div className="flex shrink-0 items-center justify-between border-b border-border/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Teleprompter Script
            </span>
          </div>
          <div className="flex overflow-hidden rounded-md border border-border/30">
            <FormatButton active={format === "text"} onClick={() => { setFormat("text"); setDraftSourceUri(null); }}>Text</FormatButton>
            <FormatButton active={format === "markdown"} onClick={() => { setFormat("markdown"); setDraftSourceUri(null); }}>Markdown</FormatButton>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <textarea
            autoFocus
            value={draftText}
            onChange={(event) => {
              setDraftText(event.target.value);
              setDraftSourceUri(null);
            }}
            placeholder="Paste a prepared answer, elevator pitch, or interview notes here..."
            className="min-h-0 flex-1 resize-none rounded-xl border border-border/30 bg-background/25 p-4 text-sm leading-relaxed text-foreground/90 outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/40"
          />
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex shrink-0 items-center justify-between gap-3">
            <span className="text-[10px] text-muted-foreground/45">
              Speech following starts when the script is loaded. Page Up / Page Down is a manual override.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={openPreparedFile}
                className="flex items-center gap-1.5 rounded-lg border border-border/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                title="Open a prepared TXT or Markdown teleprompter script"
              >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Open File
              </button>
              {document && (
                <button
                  onClick={cancelEditing}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={applyDraft}
                disabled={!draftText.trim()}
                className="rounded-lg bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Use Script
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sections = document.sections;
  const canGoBack = activeSectionIndex > 0;
  const canGoForward = activeSectionIndex < sections.length - 1;
  const statusLabel = followingEnabled
    ? followerStatus === "idle"
      ? "Ready"
      : followerStatus === "following"
        ? recoveredOnLastUpdate
          ? "Recovered"
          : "Following"
        : followerStatus === "uncertain"
          ? "Holding"
          : "Lost"
    : "Paused";
  const statusClass = !followingEnabled
    ? "bg-muted/20 text-muted-foreground/55"
    : followerStatus === "lost"
      ? "bg-destructive/10 text-destructive/80"
      : followerStatus === "uncertain"
        ? "bg-warning/10 text-warning/80"
        : "bg-success/10 text-success/80";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card/20">
      <div className="flex shrink-0 items-center justify-between border-b border-border/20 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary/80" />
          <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground/60">
            Teleprompter
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary/80">
            {document.origin === "generated" ? "AI answer" : "Prepared"}
          </span>
          {document.origin === "generated" && (
            <button
              onClick={saveCurrentAsPrepared}
              className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[9px] font-medium text-primary/75 transition-colors hover:bg-primary/15 hover:text-primary"
              title="Keep this AI answer as prepared teleprompter content without changing your reading position"
            >
              Save as Prepared
            </button>
          )}
          <button
            onClick={() => setFollowingEnabled(!followingEnabled)}
            className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors ${statusClass}`}
            title={followingEnabled ? "Pause speech following" : "Resume speech following"}
          >
            {statusLabel}
            {followingEnabled && followerConfidence > 0 ? ` ${Math.round(followerConfidence * 100)}%` : ""}
          </button>
          {sections.length > 1 && (
            <span className="text-[10px] tabular-nums text-muted-foreground/45">
              {activeSectionIndex + 1}/{sections.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <ReaderButton onClick={decreaseFontSize} title="Smaller text">
            <Minus className="h-3.5 w-3.5" />
          </ReaderButton>
          <span className="w-8 text-center text-[10px] tabular-nums text-muted-foreground/55">{fontSize}</span>
          <ReaderButton onClick={increaseFontSize} title="Larger text">
            <Plus className="h-3.5 w-3.5" />
          </ReaderButton>
          <select
            value={lineHeight}
            onChange={(event) => setLineHeight(Number(event.target.value))}
            className="ml-1 rounded-md border border-border/20 bg-background/30 px-1.5 py-1 text-[10px] text-muted-foreground outline-none"
            aria-label="Teleprompter line spacing"
            title="Line spacing"
          >
            <option value={1.25}>Tight</option>
            <option value={1.5}>Normal</option>
            <option value={1.75}>Open</option>
            <option value={2}>Wide</option>
          </select>
          <ReaderButton onClick={beginEditing} title="Edit script">
            <Pencil className="h-3.5 w-3.5" />
          </ReaderButton>
          <ReaderButton onClick={clearDocument} title="Clear script">
            <RotateCcw className="h-3.5 w-3.5" />
          </ReaderButton>
        </div>
      </div>

      {pendingDocument && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/15 bg-primary/5 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
            <span className="truncate text-[10px] font-medium text-primary/80">
              New interview answer ready — your current reading position is unchanged.
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={activatePendingDocument}
              className="rounded-md bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/25"
              title="Replace the current script with the new answer and start from its beginning"
            >
              Use new answer
            </button>
            <button
              onClick={dismissPendingDocument}
              className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-accent/50 hover:text-foreground"
              title="Dismiss new answer"
              aria-label="Dismiss new answer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-0 right-0 top-[42%] z-10 flex items-center gap-2 px-3" aria-hidden="true">
          <div className="h-px flex-1 bg-primary/20" />
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary/35">read</span>
          <div className="h-px flex-1 bg-primary/20" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-20 bg-gradient-to-t from-background/70 to-transparent" />

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain px-[8%] py-[38%] scroll-smooth"
        >
          <div className="mx-auto max-w-4xl space-y-16 pb-[38%]">
            {displaySections.map((displaySection, sectionIndex) => {
              const active = sectionIndex === activeSectionIndex;
              const sectionReadingPieceIndex = active
                ? findReadingPieceIndex(displaySection.pieces, cursorTokenIndex)
                : -1;
              return (
                <div
                  key={displaySection.section.id}
                  onClick={() => setActiveSection(sectionIndex)}
                  className={`cursor-pointer whitespace-pre-wrap transition-opacity duration-200 ${
                    active ? "opacity-100" : "opacity-35 hover:opacity-55"
                  }`}
                  style={{ fontSize: `${fontSize}px`, lineHeight }}
                >
                  {displaySection.section.title && (
                    <div className="mb-3 text-[0.42em] font-semibold uppercase tracking-[0.16em] text-primary/60">
                      {displaySection.section.title}
                    </div>
                  )}
                  {displaySection.pieces.map((piece, pieceIndex) => {
                    const state = pieceReadingState(piece, cursorTokenIndex);
                    const isReadingPiece = active && pieceIndex === sectionReadingPieceIndex;
                    if (!piece.tokenBearing) {
                      return <span key={`${piece.tokenStart}-${pieceIndex}`}>{piece.text}</span>;
                    }
                    const className =
                      state === "completed"
                        ? "text-foreground/20 transition-colors duration-200"
                        : state === "current"
                          ? "font-medium text-foreground transition-colors duration-150"
                          : "text-foreground/65 transition-colors duration-200";
                    return (
                      <span
                        key={`${piece.tokenStart}-${pieceIndex}`}
                        ref={isReadingPiece ? readingPieceRef : undefined}
                        className={className}
                      >
                        {piece.text}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border/20 px-3 py-2">
        <button
          onClick={previousSection}
          disabled={!canGoBack}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Previous
        </button>
        <span className="text-[10px] text-muted-foreground/40">
          {followingEnabled
            ? followerStatus === "uncertain" || followerStatus === "lost"
              ? "Holding position — keep speaking or use manual navigation"
              : "Speech controls the reading position"
            : "Manual override — press Paused to resume following"}
        </span>
        <button
          onClick={nextSection}
          disabled={!canGoForward}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25"
        >
          Next
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ReaderButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md p-1.5 text-muted-foreground/55 transition-colors hover:bg-accent/60 hover:text-foreground"
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function FormatButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] font-medium transition-colors ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
