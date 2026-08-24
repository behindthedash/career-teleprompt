import React from "react";
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

const params = new URLSearchParams(window.location.search);
const screen = params.get("screen") ?? "launcher";
const wizardStep = Number(params.get("step") ?? "0");

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
  </React.StrictMode>
);
