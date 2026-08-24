import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import { LauncherView } from "../launcher/LauncherView";
import { OverlayView } from "../overlay/OverlayView";
import { SettingsOverlay } from "../settings/SettingsOverlay";
import { FirstRunWizard } from "../components/wizard/FirstRunWizard";
import { DevLogFullPage } from "../components/DevLogPanel";
import { CallLogPanel } from "../calllog";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useConfigStore } from "../stores/configStore";
import { useMeetingStore } from "../stores/meetingStore";
import { useOverlayLayoutStore } from "../stores/overlayLayoutStore";
import { useTeleprompterStore } from "../stores/teleprompterStore";
import { useStreamStore } from "../stores/streamStore";
import { teleprompterDocumentFromAIResponse } from "../teleprompter/handoff";
import type { AIResponse } from "../lib/types";

const params = new URLSearchParams(window.location.search);
const screen = params.get("screen") ?? "launcher";
const visualState = params.get("state") ?? "split-default";
const wizardStep = Number(params.get("step") ?? "0");

const preparedScript = `# Introduction
Thank you for taking the time to meet with me. My background sits at the intersection of data engineering, analytics, and practical AI, and I enjoy turning ambiguous business problems into systems people can trust.

# AI and compliance
For legal and compliance work, I would start by making the policy and evidence boundaries explicit. A RAG workflow can retrieve the governing standards, while deterministic gates decide when a human approval is required.

# Why this role
What excites me about this opportunity is the chance to combine architecture, implementation, and close partnership with the people doing the work. I want to build tools that reduce friction without hiding the reasoning behind them.`;

const generatedAnswerText = `I would approach that in three layers. First, establish the authoritative policy and source documents. Second, retrieve the relevant evidence with a grounded RAG workflow. Third, keep deterministic approval gates around any action that creates legal or compliance risk. That gives the attorneys useful automation without asking them to trust an opaque model decision.`;

function makeAIResponse(id: string, content: string): AIResponse {
  return {
    id,
    content,
    mode: "WhatToSay",
    timestamp: Date.now(),
    pinned: false,
    model: "qwen2.5:7b",
    provider: "ollama",
    latency_ms: 420,
  };
}

const currentAIResponse = makeAIResponse("visual-ai-current", generatedAnswerText);
const pendingAIResponse = makeAIResponse(
  "visual-ai-pending",
  "A concise version would be: I use AI where it improves retrieval and drafting, but I keep policy interpretation, approval thresholds, and high-risk actions behind explicit human gates.",
);

// Seed stable, backend-independent state. This entry point is CI-only and never loaded
// by the Tauri application itself.
useConfigStore.setState({
  _loaded: true,
  firstRunCompleted: true,
  llmProvider: "ollama",
  llmModel: "qwen2.5:7b",
  sttProvider: "windows_native",
  sttLanguage: "en-US",
  recordingEnabled: false,
  meetingAudioConfig: {
    you: {
      role: "You",
      device_id: "default",
      is_input_device: true,
      stt_provider: "windows_native",
    },
    them: {
      role: "Them",
      device_id: "default",
      is_input_device: false,
      stt_provider: "deepgram",
    },
    recording_enabled: false,
    preset_name: null,
  },
});

useMeetingStore.setState({
  currentView: screen === "overlay" ? "overlay" : "launcher",
  previousView: null,
  settingsOpen: false,
  isRecording: screen === "overlay",
  meetingStartTime: screen === "overlay" ? Date.now() - 12 * 60 * 1000 : null,
  elapsedMs: screen === "overlay" ? 12 * 60 * 1000 : 0,
  activeMeeting:
    screen === "overlay"
      ? ({
          id: "visual-review-meeting",
          title: "Product Strategy Interview",
          started_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        } as never)
      : null,
});

function resetOverlayFixtures() {
  useOverlayLayoutStore.setState({ layoutMode: "split" });
  useTeleprompterStore.getState().clearDocument();
  useStreamStore.setState({
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
  });
}

function seedOverlayFixtures(state: string) {
  resetOverlayFixtures();

  if (state === "ai-focus" || state === "ai-to-teleprompter-handoff") {
    useOverlayLayoutStore.setState({ layoutMode: "ai" });
    useStreamStore.setState({
      isStreaming: false,
      currentContent: currentAIResponse.content,
      _rawContent: currentAIResponse.content,
      currentMode: currentAIResponse.mode,
      currentModel: currentAIResponse.model,
      currentProvider: currentAIResponse.provider,
      latencyMs: currentAIResponse.latency_ms,
      responseHistory: [currentAIResponse],
      pinnedResponses: [],
    });
    return;
  }

  if (state === "teleprompter-editing") {
    useOverlayLayoutStore.setState({ layoutMode: "teleprompt" });
    useTeleprompterStore.setState({
      document: null,
      pendingDocument: null,
      draftText: preparedScript,
      isEditing: true,
      followingEnabled: false,
    });
    return;
  }

  if (state.startsWith("teleprompter-")) {
    useOverlayLayoutStore.setState({ layoutMode: "teleprompt" });
    useTeleprompterStore.getState().setPreparedText(preparedScript, "markdown", "visual-review://prepared-script.md");
  }

  if (state === "teleprompter-following") {
    useTeleprompterStore.setState({
      cursorTokenIndex: 18,
      activeSectionIndex: 0,
      followingEnabled: true,
      followerStatus: "following",
      followerConfidence: 0.94,
      recoveredOnLastUpdate: false,
    });
  } else if (state === "teleprompter-holding") {
    useTeleprompterStore.setState({
      cursorTokenIndex: 38,
      activeSectionIndex: 1,
      followingEnabled: true,
      followerStatus: "uncertain",
      followerConfidence: 0.48,
      recoveredOnLastUpdate: false,
    });
  } else if (state === "teleprompter-lost") {
    useTeleprompterStore.setState({
      cursorTokenIndex: 45,
      activeSectionIndex: 1,
      followingEnabled: true,
      followerStatus: "lost",
      followerConfidence: 0.18,
      recoveredOnLastUpdate: false,
    });
  } else if (state === "teleprompter-pending-answer") {
    useTeleprompterStore.setState({
      cursorTokenIndex: 40,
      activeSectionIndex: 1,
      followingEnabled: false,
      followerStatus: "idle",
      followerConfidence: 0,
      recoveredOnLastUpdate: false,
    });
    useTeleprompterStore.getState().stagePendingDocument(teleprompterDocumentFromAIResponse(pendingAIResponse));
  } else if (state === "teleprompter-generated-active") {
    useTeleprompterStore.getState().setDocument(teleprompterDocumentFromAIResponse(currentAIResponse));
    useTeleprompterStore.setState({
      followingEnabled: false,
      followerStatus: "idle",
      followerConfidence: 0,
      recoveredOnLastUpdate: false,
    });
  }
}

if (screen === "overlay") seedOverlayFixtures(visualState);

function TeleprompterStateStabilizer({ state }: { state: string }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (state === "teleprompter-following") {
        useTeleprompterStore.setState({
          cursorTokenIndex: 18,
          activeSectionIndex: 0,
          followingEnabled: true,
          followerStatus: "following",
          followerConfidence: 0.94,
          recoveredOnLastUpdate: false,
        });
      } else if (state === "teleprompter-holding") {
        useTeleprompterStore.setState({
          cursorTokenIndex: 38,
          activeSectionIndex: 1,
          followingEnabled: true,
          followerStatus: "uncertain",
          followerConfidence: 0.48,
          recoveredOnLastUpdate: false,
        });
      } else if (state === "teleprompter-lost") {
        useTeleprompterStore.setState({
          cursorTokenIndex: 45,
          activeSectionIndex: 1,
          followingEnabled: true,
          followerStatus: "lost",
          followerConfidence: 0.18,
          recoveredOnLastUpdate: false,
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);
  return null;
}

function VisualReviewScreen() {
  switch (screen) {
    case "wizard":
      return <FirstRunWizard initialStep={wizardStep} />;
    case "settings":
      return <SettingsOverlay />;
    case "settings-modal":
      return (
        <div className="h-screen w-screen bg-background">
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Active meeting background
          </div>
          <SettingsOverlay isModal />
        </div>
      );
    case "overlay":
      return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
          <TeleprompterStateStabilizer state={visualState} />
          <div className="min-w-0 flex-1 overflow-hidden">
            <OverlayView />
          </div>
          <CallLogPanel />
        </div>
      );
    case "devlog":
      return <DevLogFullPage />;
    case "launcher":
    default:
      return <LauncherView />;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <ErrorBoundary fallbackMessage="Visual review screen failed to render">
        <VisualReviewScreen />
      </ErrorBoundary>
    </div>
  </React.StrictMode>,
);
