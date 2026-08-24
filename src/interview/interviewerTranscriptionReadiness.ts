import type { MeetingAudioConfig, STTProviderType } from "../lib/types";
import { hasApiKey, listLocalSTTEngines } from "../lib/ipc";

const LIVE_LOCAL_PROVIDERS = new Set<STTProviderType>([
  "sherpa_onnx",
  "ort_streaming",
]);

const LIVE_CLOUD_PROVIDERS = new Set<STTProviderType>([
  "deepgram",
  "whisper_api",
  "azure_speech",
  "groq_whisper",
]);

const CLOUD_CREDENTIAL_KEYS: Partial<Record<STTProviderType, string>> = {
  deepgram: "deepgram",
  whisper_api: "whisper_api",
  azure_speech: "azure_speech",
  groq_whisper: "groq_whisper",
};

export const DEFAULT_INTERVIEWER_STT_PROVIDER: STTProviderType = "sherpa_onnx";
export const DEFAULT_INTERVIEWER_LOCAL_MODEL = "streaming-zipformer-en-compact";

export interface InterviewerTranscriptionReadiness {
  ready: boolean;
  reason: string | null;
}

/**
 * Career Teleprompt's online interview flow is unusable without live text from
 * the remote party: no transcript means no question detection and no automatic
 * WhatToSay trigger. This guard intentionally treats that as a required runtime
 * dependency instead of silently degrading into an apparently-active meeting.
 */
export async function getInterviewerTranscriptionReadiness(
  config: MeetingAudioConfig | null,
): Promise<InterviewerTranscriptionReadiness> {
  if (!config) {
    return {
      ready: false,
      reason: "Interview audio is not configured yet.",
    };
  }

  const them = config.them;

  if (them.is_input_device) {
    return {
      ready: false,
      reason:
        "The interviewer source must be a speaker/output endpoint for online interviews.",
    };
  }

  if (them.stt_provider === "web_speech") {
    return {
      ready: false,
      reason: "Web Speech can only transcribe microphone input, not speaker loopback audio.",
    };
  }

  if (them.stt_provider === "windows_native") {
    return {
      ready: false,
      reason:
        "Windows Speech does not provide text transcription for speaker-loopback audio. Choose a streaming local or cloud provider.",
    };
  }

  if (them.stt_provider === "whisper_cpp" || them.stt_provider === "parakeet_tdt") {
    return {
      ready: false,
      reason:
        "The selected engine is batch/offline for this workflow. Choose a live streaming provider for the interviewer.",
    };
  }

  if (LIVE_LOCAL_PROVIDERS.has(them.stt_provider)) {
    try {
      const engines = await listLocalSTTEngines();
      const engine = engines.find((candidate) => candidate.engine === them.stt_provider);
      const downloadedStreamingModels =
        engine?.models.filter((model) => model.is_streaming && model.is_downloaded) ?? [];

      if (downloadedStreamingModels.length === 0) {
        return {
          ready: false,
          reason: `Download a streaming ${engine?.name ?? them.stt_provider} model before starting an interview.`,
        };
      }

      if (them.local_model_id) {
        const selected = downloadedStreamingModels.find(
          (model) => model.id === them.local_model_id,
        );
        if (!selected) {
          return {
            ready: false,
            reason: `The selected interviewer model (${them.local_model_id}) is not downloaded and ready.`,
          };
        }
      }

      return { ready: true, reason: null };
    } catch (error) {
      return {
        ready: false,
        reason: `Could not verify the local interviewer transcription model: ${String(error)}`,
      };
    }
  }

  if (LIVE_CLOUD_PROVIDERS.has(them.stt_provider)) {
    const credentialKey = CLOUD_CREDENTIAL_KEYS[them.stt_provider];
    if (!credentialKey) {
      return {
        ready: false,
        reason: `No credential mapping exists for ${them.stt_provider}.`,
      };
    }

    try {
      const keyReady = await hasApiKey(credentialKey);
      if (!keyReady) {
        return {
          ready: false,
          reason: `Add and test the ${them.stt_provider} API credentials before starting an interview.`,
        };
      }
      if (them.stt_provider === "azure_speech") {
        const regionReady = await hasApiKey("azure_speech_region");
        if (!regionReady) {
          return {
            ready: false,
            reason: "Azure Speech also requires a configured region.",
          };
        }
      }
      return { ready: true, reason: null };
    } catch (error) {
      return {
        ready: false,
        reason: `Could not verify interviewer transcription credentials: ${String(error)}`,
      };
    }
  }

  return {
    ready: false,
    reason: `Unsupported live interviewer transcription provider: ${them.stt_provider}`,
  };
}
