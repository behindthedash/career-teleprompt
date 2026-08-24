import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import "../contrast.css";
import { LauncherView } from "../launcher/LauncherView";
import { OverlayView } from "../overlay/OverlayView";
import { ActiveMeetingProvider } from "../components/ActiveMeetingProvider";
import { ToastContainer } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useConfigStore } from "../stores/configStore";
import { useMeetingStore } from "../stores/meetingStore";
import { useTranscriptStore } from "../stores/transcriptStore";
import { useTeleprompterStore } from "../stores/teleprompterStore";
import { useStreamStore } from "../stores/streamStore";
import { useRagStore } from "../stores/ragStore";
import { emit, getCommandCalls, resetBackend, workflowFixtures } from "./mocks/backend";
import type { Speaker } from "../lib/types";

interface WorkflowBridge {
  emitTranscriptFinal: (speaker: Speaker, text: string, id?: string) => void;
  commandCalls: () => ReturnType<typeof getCommandCalls>;
  state: () => {
    view: string;
    activeMeetingId: string | null;
    transcriptTexts: string[];
    teleprompter: {
      hasDocument: boolean;
      origin: string | null;
      cursorTokenIndex: number;
      followerStatus: string;
      followingEnabled: boolean;
    };
    stream: {
      isStreaming: boolean;
      currentMode: string | null;
      currentContent: string;
      responseCount: number;
    };
  };
  resetCalls: () => void;
  fixtures: typeof workflowFixtures;
}

declare global {
  interface Window {
    __CAREER_TELEPROMPT_WORKFLOW__?: WorkflowBridge;
  }
}

useConfigStore.setState({
  _loaded: true,
  firstRunCompleted: true,
  startOnLogin: false,
  recordingEnabled: false,
  llmProvider: "ollama",
  llmModel: "workflow-model",
  contextStrategy: "local_rag",
  meetingAudioConfig: {
    you: {
      role: "You",
      device_id: "workflow-mic",
      is_input_device: true,
      stt_provider: "windows_native",
    },
    them: {
      role: "Them",
      device_id: "workflow-system",
      is_input_device: false,
      stt_provider: "deepgram",
    },
    recording_enabled: false,
    preset_name: null,
  },
});

useMeetingStore.setState({
  currentView: "launcher",
  previousView: null,
  settingsOpen: false,
  activeMeeting: null,
  isRecording: false,
  meetingStartTime: null,
  elapsedMs: 0,
  recentMeetings: [],
  selectedMeetingId: null,
  audioMode: "online",
  aiScenario: "interview",
});

useRagStore.setState({
  indexStatus: {
    enabled: true,
    indexed_files: 1,
    total_files: 1,
    total_chunks: 3,
    total_tokens: 340,
    last_indexed_at: "2026-08-24T00:00:00Z",
  },
  indexStale: false,
  isIndexing: false,
  isAutoIndexing: false,
});

useTranscriptStore.getState().clearSegments();
useTeleprompterStore.getState().clearDocument();
useStreamStore.getState().clearCurrent();
resetBackend();

let transcriptCounter = 0;

window.__CAREER_TELEPROMPT_WORKFLOW__ = {
  emitTranscriptFinal(speaker, text, id) {
    transcriptCounter += 1;
    emit("transcript_final", {
      segment: {
        id: id ?? `workflow-transcript-${transcriptCounter}`,
        text,
        speaker,
        timestamp_ms: transcriptCounter * 1000,
        is_final: true,
        confidence: 0.99,
      },
    });
  },
  commandCalls: getCommandCalls,
  state() {
    const meeting = useMeetingStore.getState();
    const transcript = useTranscriptStore.getState();
    const teleprompter = useTeleprompterStore.getState();
    const stream = useStreamStore.getState();
    return {
      view: meeting.currentView,
      activeMeetingId: meeting.activeMeeting?.id ?? null,
      transcriptTexts: transcript.segments.map((segment) => segment.text),
      teleprompter: {
        hasDocument: teleprompter.document !== null,
        origin: teleprompter.document?.origin ?? null,
        cursorTokenIndex: teleprompter.cursorTokenIndex,
        followerStatus: teleprompter.followerStatus,
        followingEnabled: teleprompter.followingEnabled,
      },
      stream: {
        isStreaming: stream.isStreaming,
        currentMode: stream.currentMode,
        currentContent: stream.currentContent,
        responseCount: stream.responseHistory.length,
      },
    };
  },
  resetCalls: resetBackend,
  fixtures: workflowFixtures,
};

function WorkflowApp() {
  const currentView = useMeetingStore((state) => state.currentView);
  const activeMeeting = useMeetingStore((state) => state.activeMeeting);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <ErrorBoundary fallbackMessage="Workflow review screen failed to render">
        {currentView === "launcher" ? (
          <LauncherView />
        ) : (
          <div className="flex h-full min-w-0">
            <div className="min-w-0 flex-1 overflow-hidden">
              <OverlayView />
            </div>
          </div>
        )}
        {activeMeeting && <ActiveMeetingProvider isLauncherWindow={false} />}
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkflowApp />
  </React.StrictMode>,
);
