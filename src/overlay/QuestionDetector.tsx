import { useEffect, useState, useRef, useCallback } from "react";
import { HelpCircle, Sparkles, Check, Clock, X } from "lucide-react";
import { onQuestionDetected } from "../lib/events";
import { generateAssist } from "../lib/ipc";
import { useConfigStore } from "../stores/configStore";
import { useStreamStore } from "../stores/streamStore";
import type { DetectedQuestion } from "../lib/types";

type QuestionRequestState = "idle" | "queued" | "requested";
type QuestionRequestOrigin = "auto" | "manual";

interface TrackedQuestion extends DetectedQuestion {
  requestState: QuestionRequestState;
}

function sameQuestion(a: DetectedQuestion | null, b: DetectedQuestion): boolean {
  return Boolean(a && a.timestamp_ms === b.timestamp_ms && a.text === b.text);
}

export function QuestionDetector() {
  const [questions, setQuestions] = useState<TrackedQuestion[]>([]);
  const queuedQuestionRef = useRef<DetectedQuestion | null>(null);
  const queuedOriginRef = useRef<QuestionRequestOrigin | null>(null);
  const isStreaming = useStreamStore((state) => state.isStreaming);
  const autoTrigger = useConfigStore((state) => state.autoTrigger);

  const addQuestion = useCallback((q: DetectedQuestion) => {
    setQuestions((prev) => {
      if (prev.length > 0 && prev[0].text === q.text) return prev;
      return [{ ...q, requestState: "idle" }, ...prev].slice(0, 10);
    });
  }, []);

  const setRequestState = useCallback((q: DetectedQuestion, requestState: QuestionRequestState) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.timestamp_ms === q.timestamp_ms && item.text === q.text
          ? { ...item, requestState }
          : item,
      ),
    );
  }, []);

  const queueLatestQuestion = useCallback(
    (q: DetectedQuestion, origin: QuestionRequestOrigin) => {
      const previousQueued = queuedQuestionRef.current;
      if (previousQueued && !sameQuestion(previousQueued, q)) {
        setRequestState(previousQueued, "idle");
      }
      queuedQuestionRef.current = q;
      queuedOriginRef.current = origin;
      setRequestState(q, "queued");
    },
    [setRequestState],
  );

  const requestWhatToSay = useCallback(
    (q: DetectedQuestion, origin: QuestionRequestOrigin) => {
      if (useStreamStore.getState().isStreaming) {
        queueLatestQuestion(q, origin);
        return "queued" as const;
      }

      if (sameQuestion(queuedQuestionRef.current, q)) {
        queuedQuestionRef.current = null;
        queuedOriginRef.current = null;
      }
      setRequestState(q, "requested");
      generateAssist("WhatToSay", q.text).catch(() => setRequestState(q, "idle"));
      return "requested" as const;
    },
    [queueLatestQuestion, setRequestState],
  );

  // A question detected while another answer is generating is never dropped.
  // Once the current stream finishes, generate only the newest queued question.
  useEffect(() => {
    if (isStreaming) return;
    const queued = queuedQuestionRef.current;
    if (!queued) return;

    const origin = queuedOriginRef.current ?? "auto";
    queuedQuestionRef.current = null;
    queuedOriginRef.current = null;
    requestWhatToSay(queued, origin);
  }, [isStreaming, requestWhatToSay]);

  // A live settings change may cancel an automatically queued request, but it
  // must never erase an explicit manual request the user made while streaming.
  useEffect(() => {
    if (autoTrigger || queuedOriginRef.current !== "auto") return;
    const queued = queuedQuestionRef.current;
    if (!queued) return;

    queuedQuestionRef.current = null;
    queuedOriginRef.current = null;
    setRequestState(queued, "idle");
  }, [autoTrigger, setRequestState]);

  useEffect(() => {
    const p = onQuestionDetected((event) => {
      if (event.source !== "Them" && event.source !== "Interviewer") return;

      // The Rust question detector is authoritative. It already assembles adjacent
      // interviewer STT finals and suppresses corrected/duplicate questions.
      addQuestion(event);

      if (useConfigStore.getState().autoTrigger) {
        requestWhatToSay(event, "auto");
      }
    });
    return () => {
      p.then((u) => u());
    };
  }, [addQuestion, requestWhatToSay]);

  const handleAssist = useCallback(
    (index: number) => {
      const question = questions[index];
      if (!question || question.requestState !== "idle") return;
      requestWhatToSay(question, "manual");
    },
    [questions, requestWhatToSay],
  );

  const handleDismiss = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = questions[index];
    if (target && sameQuestion(queuedQuestionRef.current, target)) {
      queuedQuestionRef.current = null;
      queuedOriginRef.current = null;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, [questions]);

  const latest = questions.length > 0 ? questions[0] : null;
  const previousQuestions = questions.slice(1, 4);

  const requestLabel = (state: QuestionRequestState) =>
    state === "queued" ? "Queued" : state === "requested" ? "Requested" : "What to Say";

  return (
    <div className="flex flex-col gap-2.5" role="region" aria-label="Detected questions">
      <div
        className={`group flex items-start gap-3 rounded-lg transition-all duration-200 ${
          latest ? "cursor-pointer hover:bg-info/10 question-card-enter" : ""
        }`}
        onClick={() => latest && latest.requestState === "idle" && handleAssist(0)}
        onKeyDown={(e) => {
          if (latest && latest.requestState === "idle" && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleAssist(0);
          }
        }}
        role={latest ? "button" : undefined}
        tabIndex={latest ? 0 : undefined}
        aria-label={latest ? `Question: ${latest.text}. ${latest.requestState === "queued" ? "Answer queued" : latest.requestState === "requested" ? "Answer requested" : "Click for What to Say"}` : undefined}
      >
        <div className="relative mt-0.5 shrink-0" aria-hidden="true">
          <HelpCircle className={`h-5 w-5 transition-colors ${latest ? "text-info" : "text-muted-foreground/50"}`} />
          {latest?.requestState === "idle" && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-info animate-pulse" />
          )}
          {latest?.requestState === "requested" && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-success">
              <Check className="h-2 w-2 text-white" />
            </span>
          )}
          {latest?.requestState === "queued" && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-muted">
              <Clock className="h-2 w-2 text-foreground" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {latest ? (
            <p className="text-sm leading-relaxed font-medium text-foreground/90">
              &ldquo;{latest.text}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50">
              Listening for questions from the other party
            </p>
          )}
        </div>

        {latest && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (latest.requestState === "idle") handleAssist(0);
              }}
              aria-label={latest.requestState === "queued" ? "What to Say queued" : latest.requestState === "requested" ? "What to Say requested" : "Get What to Say for this question"}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                latest.requestState === "requested"
                  ? "bg-success/10 border border-success/20 text-success"
                  : latest.requestState === "queued"
                    ? "bg-muted/20 border border-border/20 text-muted-foreground"
                    : "bg-info/10 border border-info/20 text-info hover:bg-info/20"
              }`}
            >
              {latest.requestState === "requested" ? (
                <><Check className="h-3.5 w-3.5" aria-hidden="true" />{requestLabel(latest.requestState)}</>
              ) : latest.requestState === "queued" ? (
                <><Clock className="h-3.5 w-3.5" aria-hidden="true" />{requestLabel(latest.requestState)}</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{requestLabel(latest.requestState)}</>
              )}
            </button>
            <button
              onClick={(e) => handleDismiss(0, e)}
              aria-label="Dismiss question"
              className="rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {previousQuestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {previousQuestions.map((q, idx) => {
            const realIdx = idx + 1;
            const active = q.requestState !== "idle";
            return (
              <div
                key={`q-${realIdx}-${q.timestamp_ms}`}
                className={`group/q flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all duration-150 question-card-enter ${
                  active
                    ? "bg-success/5 border border-success/10"
                    : "bg-card/20 hover:bg-card/40 hover:border-border/20 cursor-pointer"
                }`}
                onClick={() => !active && handleAssist(realIdx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (!active && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleAssist(realIdx);
                  }
                }}
                title={q.text}
              >
                <div className="shrink-0">
                  {q.requestState === "requested" ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                      <Check className="h-2.5 w-2.5 text-success" />
                    </div>
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted/30">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                    </div>
                  )}
                </div>

                <span className={`flex-1 truncate text-xs leading-snug transition-colors ${
                  active
                    ? "text-success/70 font-medium"
                    : "text-muted-foreground/60 group-hover/q:text-foreground/80"
                }`}>
                  {q.text}
                </span>

                {!active && (
                  <Sparkles className="h-3 w-3 shrink-0 text-info/0 group-hover/q:text-info/60 transition-colors" />
                )}
                <button
                  onClick={(e) => handleDismiss(realIdx, e)}
                  aria-label="Dismiss question"
                  className="rounded p-0.5 text-muted-foreground/0 opacity-0 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive group-hover/q:opacity-100 group-hover/q:text-muted-foreground/30 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
