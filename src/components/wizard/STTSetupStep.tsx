// Wizard Step 3: STT Configuration — per-party STT provider selection.

import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useConfigStore } from "../../stores/configStore";
import { hasApiKey, listLocalSTTEngines } from "../../lib/ipc";
import type {
  LocalSTTEngineInfo,
  MeetingAudioConfig,
  ModelDownloadProgress,
  STTProviderType,
} from "../../lib/types";
import { LocalModelManager } from "../../settings/LocalModelManager";
import {
  DEFAULT_INTERVIEWER_LOCAL_MODEL,
  DEFAULT_INTERVIEWER_STT_PROVIDER,
} from "../../interview/interviewerTranscriptionReadiness";
import {
  Globe,
  Server,
  Cloud,
  Zap,
  CheckCircle,
  AlertCircle,
  Monitor,
} from "lucide-react";

interface ProviderChoice {
  value: STTProviderType;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresKey: boolean;
  free: boolean;
  supportsInterviewer: boolean;
}

const PROVIDERS: ProviderChoice[] = [
  {
    value: "web_speech",
    label: "Web Speech API",
    icon: <Globe className="h-4 w-4" />,
    description: "Browser-native microphone transcription",
    requiresKey: false,
    free: true,
    supportsInterviewer: false,
  },
  {
    value: "windows_native",
    label: "Windows Speech",
    icon: <Monitor className="h-4 w-4" />,
    description: "Built-in Windows microphone transcription",
    requiresKey: false,
    free: true,
    supportsInterviewer: false,
  },
  {
    value: "sherpa_onnx",
    label: "Sherpa-ONNX (Local Streaming)",
    icon: <Server className="h-4 w-4" />,
    description: "Live speaker-loopback transcription — offline and free",
    requiresKey: false,
    free: true,
    supportsInterviewer: true,
  },
  {
    value: "whisper_cpp",
    label: "Whisper.cpp (Batch)",
    icon: <Server className="h-4 w-4" />,
    description: "Batch/offline transcription; not suitable for live interviewer audio",
    requiresKey: false,
    free: true,
    supportsInterviewer: false,
  },
  {
    value: "deepgram",
    label: "Deepgram",
    icon: <Cloud className="h-4 w-4" />,
    description: "Real-time streaming STT, high accuracy",
    requiresKey: true,
    free: false,
    supportsInterviewer: true,
  },
  {
    value: "whisper_api",
    label: "Whisper API",
    icon: <Cloud className="h-4 w-4" />,
    description: "OpenAI Whisper cloud transcription",
    requiresKey: true,
    free: false,
    supportsInterviewer: true,
  },
  {
    value: "groq_whisper",
    label: "Groq Whisper",
    icon: <Zap className="h-4 w-4" />,
    description: "Fast cloud Whisper transcription",
    requiresKey: true,
    free: false,
    supportsInterviewer: true,
  },
];

const interviewerProviders = PROVIDERS.filter((provider) => provider.supportsInterviewer);

interface STTSetupStepProps {
  onReadinessChange?: (ready: boolean) => void;
}

export function STTSetupStep({ onReadinessChange }: STTSetupStepProps) {
  const meetingAudioConfig = useConfigStore((s) => s.meetingAudioConfig);
  const setMeetingAudioConfig = useConfigStore((s) => s.setMeetingAudioConfig);
  const activeModelPerEngine = useConfigStore((s) => s.activeModelPerEngine);

  const initialThemProvider = interviewerProviders.some(
    (provider) => provider.value === meetingAudioConfig?.them.stt_provider,
  )
    ? meetingAudioConfig!.them.stt_provider
    : DEFAULT_INTERVIEWER_STT_PROVIDER;

  const [youSTT, setYouSTT] = useState<STTProviderType>(
    meetingAudioConfig?.you.stt_provider ?? "web_speech",
  );
  const [themSTT, setThemSTT] = useState<STTProviderType>(initialThemProvider);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [localEngines, setLocalEngines] = useState<LocalSTTEngineInfo[]>([]);

  const refreshReadinessInputs = useCallback(async () => {
    const providers = ["deepgram", "whisper_api", "groq_whisper"];
    const status: Record<string, boolean> = {};
    for (const provider of providers) {
      try {
        status[provider] = await hasApiKey(provider);
      } catch {
        status[provider] = false;
      }
    }
    setKeyStatus(status);

    try {
      setLocalEngines(await listLocalSTTEngines());
    } catch {
      setLocalEngines([]);
    }
  }, []);

  useEffect(() => {
    refreshReadinessInputs();

    let unlisten: (() => void) | null = null;
    listen<ModelDownloadProgress>("model_download_progress", (event) => {
      if (event.payload.status === "complete" || event.payload.status === "error") {
        refreshReadinessInputs();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, [refreshReadinessInputs, activeModelPerEngine.sherpa_onnx]);

  const selectedInterviewerModel =
    activeModelPerEngine.sherpa_onnx ??
    meetingAudioConfig?.them.local_model_id ??
    DEFAULT_INTERVIEWER_LOCAL_MODEL;

  const interviewerReady = useMemo(() => {
    if (themSTT === "sherpa_onnx") {
      const engine = localEngines.find((candidate) => candidate.engine === "sherpa_onnx");
      return (
        engine?.models.some(
          (model) =>
            model.id === selectedInterviewerModel && model.is_streaming && model.is_downloaded,
        ) ?? false
      );
    }

    const selected = PROVIDERS.find((provider) => provider.value === themSTT);
    if (!selected?.supportsInterviewer) return false;
    return selected.requiresKey ? keyStatus[themSTT] === true : true;
  }, [keyStatus, localEngines, selectedInterviewerModel, themSTT]);

  // Persist selections and migrate the old fresh-install Whisper.cpp default to
  // a real streaming interviewer engine. Equality checks prevent a store-update
  // loop when this effect observes the config object it just persisted.
  useEffect(() => {
    if (!meetingAudioConfig) {
      onReadinessChange?.(false);
      return;
    }

    const nextLocalModelId =
      themSTT === "sherpa_onnx" ? selectedInterviewerModel : undefined;
    const alreadyPersisted =
      meetingAudioConfig.you.stt_provider === youSTT &&
      meetingAudioConfig.them.stt_provider === themSTT &&
      meetingAudioConfig.them.local_model_id === nextLocalModelId;

    if (!alreadyPersisted) {
      const updated: MeetingAudioConfig = {
        ...meetingAudioConfig,
        you: { ...meetingAudioConfig.you, stt_provider: youSTT },
        them: {
          ...meetingAudioConfig.them,
          stt_provider: themSTT,
          local_model_id: nextLocalModelId,
        },
        preset_name: null,
      };
      setMeetingAudioConfig(updated);
    }

    onReadinessChange?.(interviewerReady);
  }, [
    interviewerReady,
    meetingAudioConfig,
    onReadinessChange,
    selectedInterviewerModel,
    setMeetingAudioConfig,
    themSTT,
    youSTT,
  ]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-md shadow-primary/10">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Speech-to-Text Setup
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Choose how each party&apos;s audio gets transcribed.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-foreground leading-relaxed">
            <strong>Interview requirement:</strong> speaker audio from <strong>Them</strong> must
            use a live transcription engine. The free default is Sherpa-ONNX; download its
            compact streaming model below before continuing.
          </p>
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2.5 text-sm font-medium text-foreground">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-meta font-semibold uppercase tracking-wide text-primary">
              You
            </span>
            STT Provider
          </label>
          <div className="grid grid-cols-1 gap-2">
            {PROVIDERS.map((provider) => (
              <ProviderButton
                key={provider.value}
                provider={provider}
                selected={youSTT === provider.value}
                hasKey={provider.requiresKey ? keyStatus[provider.value] ?? false : true}
                onSelect={() => setYouSTT(provider.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2.5 text-sm font-medium text-foreground">
            <span className="rounded-lg bg-muted px-2 py-1 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
              Them
            </span>
            Live STT Provider
          </label>
          <div className="grid grid-cols-1 gap-2">
            {interviewerProviders.map((provider) => (
              <ProviderButton
                key={provider.value}
                provider={provider}
                selected={themSTT === provider.value}
                hasKey={provider.requiresKey ? keyStatus[provider.value] ?? false : true}
                onSelect={() => setThemSTT(provider.value)}
              />
            ))}
          </div>

          {themSTT === "sherpa_onnx" && (
            <div className="mt-3 rounded-xl border border-border/40 bg-secondary/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Required streaming model</p>
                  <p className="text-meta text-muted-foreground">
                    Recommended: English Compact (~122 MB)
                  </p>
                </div>
                {interviewerReady ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle className="h-3.5 w-3.5" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                    <AlertCircle className="h-3.5 w-3.5" /> Download required
                  </span>
                )}
              </div>
              <LocalModelManager compact engineFilter="sherpa_onnx" />
            </div>
          )}

          {themSTT !== "sherpa_onnx" && !interviewerReady && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
              <AlertCircle className="h-3.5 w-3.5" />
              Configure this provider&apos;s credentials before continuing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderButton({
  provider,
  selected,
  hasKey,
  onSelect,
}: {
  provider: ProviderChoice;
  selected: boolean;
  hasKey: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
          : "border-border/40 hover:border-border/60 hover:bg-accent/20"
      }`}
    >
      <span className={selected ? "text-primary" : "text-muted-foreground"}>
        {provider.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{provider.label}</span>
          {provider.free && (
            <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-meta font-semibold text-success">
              FREE
            </span>
          )}
          {provider.requiresKey && hasKey && (
            <CheckCircle className="h-3 w-3 text-success" />
          )}
          {provider.requiresKey && !hasKey && (
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{provider.description}</p>
      </div>
    </button>
  );
}
