import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useTeleprompterStore } from "../stores/teleprompterStore";
import type { TeleprompterFormat } from "../teleprompter/content";

export function TeleprompterPanel() {
  const document = useTeleprompterStore((state) => state.document);
  const draftText = useTeleprompterStore((state) => state.draftText);
  const activeSectionIndex = useTeleprompterStore((state) => state.activeSectionIndex);
  const fontSize = useTeleprompterStore((state) => state.fontSize);
  const lineHeight = useTeleprompterStore((state) => state.lineHeight);
  const isEditing = useTeleprompterStore((state) => state.isEditing);
  const setDraftText = useTeleprompterStore((state) => state.setDraftText);
  const setPreparedText = useTeleprompterStore((state) => state.setPreparedText);
  const clearDocument = useTeleprompterStore((state) => state.clearDocument);
  const beginEditing = useTeleprompterStore((state) => state.beginEditing);
  const cancelEditing = useTeleprompterStore((state) => state.cancelEditing);
  const previousSection = useTeleprompterStore((state) => state.previousSection);
  const nextSection = useTeleprompterStore((state) => state.nextSection);
  const increaseFontSize = useTeleprompterStore((state) => state.increaseFontSize);
  const decreaseFontSize = useTeleprompterStore((state) => state.decreaseFontSize);
  const setLineHeight = useTeleprompterStore((state) => state.setLineHeight);

  const [format, setFormat] = useState<TeleprompterFormat>("text");
  const [error, setError] = useState<string | null>(null);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isEditing) return;
    sectionRefs.current[activeSectionIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeSectionIndex, isEditing]);

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
      setPreparedText(draftText, format);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load teleprompter script");
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
          <div className="flex rounded-md border border-border/30 overflow-hidden">
            <FormatButton active={format === "text"} onClick={() => setFormat("text")}>Text</FormatButton>
            <FormatButton active={format === "markdown"} onClick={() => setFormat("markdown")}>Markdown</FormatButton>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <textarea
            autoFocus
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
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
              Page Up / Page Down moves between prepared sections while prompting.
            </span>
            <div className="flex items-center gap-2">
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
            {sections.map((section, index) => {
              const active = index === activeSectionIndex;
              return (
                <div
                  key={section.id}
                  ref={(element) => { sectionRefs.current[index] = element; }}
                  onClick={() => useTeleprompterStore.getState().setActiveSection(index)}
                  className={`cursor-pointer whitespace-pre-wrap transition-opacity duration-200 ${
                    active ? "text-foreground" : "text-foreground/35 hover:text-foreground/55"
                  }`}
                  style={{ fontSize: `${fontSize}px`, lineHeight }}
                >
                  {section.title && (
                    <div className="mb-3 text-[0.42em] font-semibold uppercase tracking-[0.16em] text-primary/60">
                      {section.title}
                    </div>
                  )}
                  {section.displayText}
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
        <span className="text-[10px] text-muted-foreground/40">Manual mode</span>
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
