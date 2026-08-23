# Change: Live Performance Diagnostics

## Why

Hearsay already exposes a 4s/1s live transcription profile and records content-free throughput/backlog metrics, but validating whether a Windows machine can sustain that profile currently requires developer tooling and command-line steps. That is not an acceptable product workflow for an installed desktop application.

A normal Hearsay user should be able to validate live transcription performance from the application itself, using the same packaged runtime and hardware that will be used in production, without installing Git or Python, downloading repository source, writing launcher scripts, or interpreting raw logs.

This change adds a generic in-app diagnostics workflow that measures the existing live profile on CPU and supported NVIDIA GPU configurations, explains the result in plain language, and can export a content-free report for validation or support.

## What Changes

- Add a built-in **Transcription Performance Test** accessible from the Hearsay UI.
- Detect the current CPU and NVIDIA GPU capabilities and present only supported test configurations.
- Run the existing 4s/1s live transcription profile through a controlled diagnostic session without creating a transcript artifact.
- Reuse existing runtime RTF, backlog, and health observations rather than inventing a parallel measurement path.
- Require a meaningful effective-audio sample before reporting the test as complete.
- Present aggregate performance results in human-readable terms, including whether the configuration is suitable, marginal, or unsuitable for live transcription.
- Allow export of a content-free text or JSON diagnostics report.
- Keep all diagnostics generic to local transcription performance; no interview, retrieval, vector, LLM, or downstream-consumer behavior is added.

## Non-Goals

- No synthetic speech generation or benchmark corpus bundled into the application.
- No automatic model switching during ordinary recording sessions.
- No cloud telemetry or upload of transcripts, audio, or diagnostic results.
- No replacement for real-device audio validation.
- No interview-copilot or teleprompter behavior.

## Impact

### User experience

A user can install Hearsay, open diagnostics, choose CPU or GPU performance testing, provide several minutes of normal speech/audio, and receive a clear result without developer tooling.

### Architecture

The diagnostics UI orchestrates existing generic host capabilities:

- `LIVE_TRANSCRIPTION_PROFILE`
- `SessionOutputMode.LIVE_ONLY`
- existing hardware/model configuration
- existing `TranscriptionMetrics`

The implementation should extract reusable report aggregation from the current log summarizer where practical so the in-app and offline reports use the same definitions.

### Privacy

The diagnostics result must remain content-free. Audio continues to be processed locally and is not persisted by the diagnostics workflow. Exported reports contain performance and hardware metadata only, never transcript text or captured audio.
