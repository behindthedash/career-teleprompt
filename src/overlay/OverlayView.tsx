import { useCallback, useMemo, useState } from "react";
import { useMeetingStore } from "../stores/meetingStore";
import { useScenarioStore } from "../stores/scenarioStore";
import { useCallLogStore } from "../stores/callLogStore";
import { useAIActionsStore } from "../stores/aiActionsStore";
import { useTranslationStore } from "../stores/translationStore";
import { useOverlayLayoutStore } from "../stores/overlayLayoutStore";
import { showToast } from "../stores/toastStore";
import { translateBatch } from "../lib/ipc";
import { TranscriptPanel } from "./TranscriptPanel";
import { QuestionDetector } from "./QuestionDetector";
import { AIResponsePanel } from "./AIResponsePanel";
import { ModeButtons } from "./ModeButtons";
import { AskInput } from "./AskInput";
import { TeleprompterPanel } from "./TeleprompterPanel";
import { ServiceStatusBar } from "../components/ServiceStatusBar";
import { DevLogPanel } from "../components/DevLogPanel";
import { SpeakerStatsPanel } from "./SpeakerStatsPanel";
import { BookmarkToast } from "./BookmarkToast";
import { BookmarkPanel } from "./BookmarkPanel";
import { useBookmarkHotkey } from "../hooks/useBookmarkHotkey";
import { useMeetingShortcuts } from "../hooks/useMeetingShortcuts";
import { useConfigStore } from "../stores/configStore";
import { useSpeakerDetection } from "../hooks/useSpeakerDetection";
import { useTopicDetection } from "../hooks/useTopicDetection";
import { useTranslation } from "../hooks/useTranslation";
import { MODE_COLORS } from "../lib/speakerColors";
import { showLauncherWindow } from "../lib/windows";
import {
  Activity,
  BarChart3,
  Bookmark,
  BookOpenText,
  Columns2,
  Eye,
  Globe,
  GripHorizontal,
  Mic,
  MicOff,
  Minus,
  PanelLeftClose,
  PanelRightClose,
  Settings,
  Square,
  Terminal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDuration } from "../lib/utils";

export function OverlayView() {
  const activeMeeting = useMeetingStore((state) => state.activeMeeting);
  const elapsedMs = useMeetingStore((state) => state.elapsedMs);
  const recordingEnabled = useConfigStore((state) => state.recordingEnabled);
  const audioMode = useMeetingStore((state) => state.audioMode);
  const endMeetingFlow = useMeetingStore((state) => state.endMeetingFlow);
  const setCurrentView = useMeetingStore((state) => state.setCurrentView);
  const scenarioTemplate = useScenarioStore((state) => state.getActiveTemplate());
  const [askInputVisible, setAskInputVisible] = useState(false);
  const [devLogOpen, setDevLogOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const layoutMode = useOverlayLayoutStore((state) => state.layoutMode);
  const setLayoutMode = useOverlayLayoutStore((state) => state.setLayoutMode);
  const cycleLayout = useOverlayLayoutStore((state) => state.cycleLayout);
  const toggleTeleprompter = useOverlayLayoutStore((state) => state.toggleTeleprompter);
  const toggleLog = useCallLogStore((state) => state.toggleOpen);
  const logOpen = useCallLogStore((state) => state.isOpen);
  const autoTrigger = useAIActionsStore((state) => state.configs.globalDefaults.autoTrigger);

  const mutedYou = useConfigStore((state) => state.mutedYou);
  const mutedThem = useConfigStore((state) => state.mutedThem);
  const toggleMuteYou = useConfigStore((state) => state.toggleMuteYou);
  const toggleMuteThem = useConfigStore((state) => state.toggleMuteThem);
  const overlayOpacity = useConfigStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useConfigStore((state) => state.setOverlayOpacity);

  const autoTranslateActive = useTranslationStore((state) => state.autoTranslateActive);
  const setAutoTranslateActive = useTranslationStore((state) => state.setAutoTranslateActive);
  const displayMode = useTranslationStore((state) => state.displayMode);
  const setDisplayMode = useTranslationStore((state) => state.setDisplayMode);
  const targetLang = useTranslationStore((state) => state.targetLang);
  const batchProgress = useTranslationStore((state) => state.batchProgress);
  const isBatchTranslating = batchProgress !== null;

  const cycleOpacity = () => {
    const presets = [0.9, 0.65, 0.35, 0.1];
    const current = presets.findIndex((preset) => Math.abs(preset - overlayOpacity) < 0.08);
    setOverlayOpacity(presets[(current + 1) % presets.length]);
  };

  const addBookmarkAtNow = useBookmarkHotkey();
  const shortcutActions = useMemo(
    () => ({
      addBookmark: addBookmarkAtNow,
      toggleStats: () => setStatsOpen((previous) => !previous),
      toggleBookmarks: () => setBookmarksOpen((previous) => !previous),
      toggleMute: () => useConfigStore.getState().toggleMuteYou(),
      closeAllPanels: () => {
        setStatsOpen(false);
        setBookmarksOpen(false);
        setDevLogOpen(false);
      },
      toggleDevLog: () => setDevLogOpen((previous) => !previous),
    }),
    [addBookmarkAtNow],
  );
  useMeetingShortcuts(shortcutActions);

  useSpeakerDetection();
  useTopicDetection();
  useTranslation();

  const handleEndMeeting = useCallback(async () => {
    try {
      await endMeetingFlow();
      showToast("Meeting ended", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't end meeting", "error");
    }
  }, [endMeetingFlow]);

  const handleTranslateAll = useCallback(async () => {
    const meetingId = activeMeeting?.id;
    if (!meetingId || !targetLang) return;
    try {
      const { total, alreadyDone, newlyTranslated } = await translateBatch(meetingId, targetLang);
      if (newlyTranslated === 0) {
        showToast(`All ${total} segments already translated`, "info");
      } else if (alreadyDone > 0) {
        showToast(
          `Translated ${newlyTranslated} new segments (${alreadyDone} already cached, ${total} total)`,
          "success",
        );
      } else {
        showToast(`Translated all ${total} segments`, "success");
      }
    } catch (error) {
      showToast(`Batch translation failed: ${error}`, "error");
    }
  }, [activeMeeting?.id, targetLang]);

  const handleMinimizeToDashboard = useCallback(() => {
    setCurrentView("launcher");
    showLauncherWindow().catch(() => {});
  }, [setCurrentView]);

  const meetingTitle = activeMeeting?.title || "Career Teleprompt";
  const cycleIcon =
    layoutMode === "split" ? (
      <Columns2 className="h-3.5 w-3.5" />
    ) : layoutMode === "ai" ? (
      <PanelLeftClose className="h-3.5 w-3.5" />
    ) : (
      <PanelRightClose className="h-3.5 w-3.5" />
    );
  const cycleTooltip =
    layoutMode === "teleprompt"
      ? "Return to split view"
      : layoutMode === "split"
        ? "Focus AI panel"
        : layoutMode === "ai"
          ? "Focus Transcript"
          : "Split view";

  return (
    <main
      className="overlay-bg flex h-full flex-col rounded-xl border border-border/20 shadow-xl"
      aria-labelledby="overlay-heading"
      style={{
        background: `hsl(var(--background) / ${overlayOpacity})`,
        backdropFilter: overlayOpacity > 0.7 ? "blur(12px) saturate(1.1)" : "none",
      }}
    >
      <div
        className="no-select flex items-center justify-between gap-3 px-4 py-2 cursor-move"
        data-tauri-drag-region
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.12)" }}
      >
        <div className="flex items-center gap-2.5" data-tauri-drag-region>
          <GripHorizontal className="h-3 w-3 text-muted-foreground/40" aria-hidden="true" />
          <h1
            id="overlay-heading"
            className="max-w-[160px] truncate text-xs font-semibold text-foreground/90"
            title={meetingTitle}
          >
            {meetingTitle}
          </h1>
          {recordingEnabled && (
            <div
              className="flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-0.5 ring-1 ring-destructive/10"
              role="status"
              aria-label="Recording in progress"
            >
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <span className="text-meta font-semibold tracking-wide text-destructive">REC</span>
            </div>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
            style={{ color: MODE_COLORS[audioMode].text, backgroundColor: MODE_COLORS[audioMode].bg }}
          >
            {audioMode === "online" ? "ONLINE" : "IN-PERSON"}
          </span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {scenarioTemplate.name}
          </span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground/60">
            {elapsedMs > 0 ? formatDuration(elapsedMs) : "00:00"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMuteYou}
            className={`rounded-lg p-2 transition-all duration-150 ${
              mutedYou
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : "text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground"
            }`}
            aria-label={mutedYou ? "Unmute mic (You)" : "Mute mic (You)"}
            aria-pressed={mutedYou}
            title={mutedYou ? "Unmute mic (You)" : "Mute mic (You)"}
          >
            {mutedYou ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={toggleMuteThem}
            className={`rounded-lg p-2 transition-all duration-150 ${
              mutedThem
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : "text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground"
            }`}
            aria-label={mutedThem ? "Unmute them" : "Mute them"}
            aria-pressed={mutedThem}
            title={mutedThem ? "Unmute them" : "Mute them"}
          >
            {mutedThem ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <div className="mx-0.5 h-3.5 w-px bg-border/20" />
          <HeaderBtn icon={cycleIcon} onClick={cycleLayout} tooltip={cycleTooltip} />
          <HeaderBtn
            icon={<BookOpenText className="h-3.5 w-3.5" />}
            active={layoutMode === "teleprompt"}
            onClick={toggleTeleprompter}
            tooltip="Teleprompter"
          />
          <div className="mx-0.5 h-3.5 w-px bg-border/20" />

          <HeaderBtn
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            active={statsOpen}
            onClick={() => setStatsOpen((previous) => !previous)}
            tooltip="Speaker Stats (S)"
          />
          <HeaderBtn
            icon={<Bookmark className="h-3.5 w-3.5" />}
            active={bookmarksOpen}
            onClick={() => setBookmarksOpen((previous) => !previous)}
            tooltip="Bookmarks (K)"
          />
          <HeaderBtn
            icon={<Activity className="h-3.5 w-3.5" />}
            active={logOpen}
            onClick={toggleLog}
            tooltip="AI Call Log"
          />
          <HeaderBtn
            icon={<Terminal className="h-3.5 w-3.5" />}
            active={devLogOpen}
            onClick={() => setDevLogOpen((previous) => !previous)}
            tooltip="Dev Log (Ctrl+Shift+L)"
          />
          <HeaderBtn
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={cycleOpacity}
            tooltip={`Transparency: ${Math.round(overlayOpacity * 100)}% (click to cycle)`}
          />
          <HeaderBtn
            icon={<Settings className="h-3.5 w-3.5" />}
            onClick={() => setCurrentView("settings")}
            tooltip="Settings"
          />
          <HeaderBtn
            icon={<Minus className="h-3.5 w-3.5" />}
            onClick={handleMinimizeToDashboard}
            tooltip="Minimize to Dashboard"
          />

          <button
            onClick={() => setAutoTranslateActive(!autoTranslateActive)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              autoTranslateActive
                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                : "text-muted-foreground hover:bg-accent"
            }`}
            title="Toggle auto-translate"
          >
            <Globe className="h-3 w-3" />
            Translate
          </button>

          {autoTranslateActive && (
            <>
              <div className="flex overflow-hidden rounded-md border border-border/30">
                <button
                  onClick={() => setDisplayMode("inline")}
                  className={`px-2 py-0.5 text-[10px] font-medium transition-all ${
                    displayMode === "inline" ? "bg-primary/15 text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  Inline
                </button>
                <button
                  onClick={() => setDisplayMode("hover")}
                  className={`border-l border-border/30 px-2 py-0.5 text-[10px] font-medium transition-all ${
                    displayMode === "hover" ? "bg-primary/15 text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  Hover
                </button>
              </div>
              <button
                onClick={handleTranslateAll}
                disabled={isBatchTranslating}
                className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                title="Translate all past transcript segments"
              >
                {isBatchTranslating ? "Translating..." : "Translate All"}
              </button>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                {targetLang.toUpperCase()}
              </span>
            </>
          )}

          <button
            onClick={handleEndMeeting}
            className="ml-1.5 flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-all duration-150 hover:border-destructive/30 hover:bg-destructive/20 hover:shadow-sm hover:shadow-destructive/10"
            aria-label="End meeting"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden="true" />
            End
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex flex-wrap gap-2.5 overflow-hidden px-3 py-2.5">
          {layoutMode === "teleprompt" ? (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <TeleprompterPanel />
            </div>
          ) : (
            <>
              {layoutMode !== "ai" ? (
                <div className="flex min-h-0 min-w-[180px] flex-1 basis-[220px] flex-col overflow-hidden rounded-xl bg-card/20">
                  <div className="flex shrink-0 items-center border-b border-border/20 px-3 py-1.5">
                    <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Transcript
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2.5">
                    <TranscriptPanel />
                  </div>
                </div>
              ) : (
                <CollapsedPanel label="Transcript" onClick={() => setLayoutMode("split")} />
              )}

              {layoutMode !== "transcript" ? (
                <div className="flex min-h-0 min-w-[180px] flex-1 basis-[220px] flex-col gap-2.5 overflow-hidden">
                  {autoTrigger && (
                    <div className="shrink-0 rounded-xl border border-info/10 bg-info/5 px-4 py-3">
                      <QuestionDetector />
                    </div>
                  )}
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card/20">
                    <div className="flex shrink-0 items-center gap-1 border-b border-border/20 px-2.5 py-1.5">
                      <ModeButtons />
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-3">
                      <AIResponsePanel />
                    </div>
                  </div>
                </div>
              ) : (
                <CollapsedPanel label="AI" onClick={() => setLayoutMode("split")} />
              )}
            </>
          )}
        </div>
      </div>

      {askInputVisible && (
        <div className="slide-down-enter border-t border-border/20 px-3 py-1.5">
          <AskInput visible={askInputVisible} onClose={() => setAskInputVisible(false)} />
        </div>
      )}

      <DevLogPanel open={devLogOpen} onClose={() => setDevLogOpen(false)} />

      {statsOpen && (
        <div className="border-t border-border/20 px-3 py-2">
          <SpeakerStatsPanel isOpen={statsOpen} />
        </div>
      )}

      {bookmarksOpen && <BookmarkPanel />}
      <BookmarkToast />

      <div className="border-t border-border/20">
        <ServiceStatusBar compact />
      </div>
    </main>
  );
}

function CollapsedPanel({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      className="flex min-h-0 w-8 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl bg-card/20 transition-all duration-200 hover:bg-card/30"
      onClick={onClick}
      role="button"
      aria-label={`Expand ${label.toLowerCase()} panel`}
      title={`Expand ${label.toLowerCase()}`}
    >
      <span
        className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}

function HeaderBtn({
  icon,
  active,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 transition-all duration-150 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground"
      }`}
      aria-label={tooltip}
      aria-pressed={active}
      title={tooltip}
    >
      {icon}
    </button>
  );
}
