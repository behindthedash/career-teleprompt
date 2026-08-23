# Design: Live Performance Diagnostics

## Context

The low-latency transcription change introduced an immutable 4s/1s live profile plus per-window `TranscriptionMetrics` containing realtime factor, queue depth, and healthy/behind classification. PR #18 added an offline summarizer that reconstructs sessions from logs and aggregates those observations into content-free reports.

That gives developers a repeatable validation mechanism, but it still requires repository access and command-line execution. The installed Hearsay application should expose the same capability directly.

## Goals

- Make live-profile validation usable from the packaged Windows application.
- Reuse the existing transcription runtime and metric semantics.
- Keep the workflow privacy-preserving and content-free.
- Make CPU and NVIDIA GPU tests directly comparable.
- Provide enough result context for a user or support engineer to understand whether live transcription can keep pace.

## Decisions

### 1. Add an explicit diagnostics workflow, not a hidden developer mode

The performance test must be reachable from normal application UI, such as **Settings → Diagnostics → Transcription Performance** or an equivalent stable location.

The workflow owns its own start/stop lifecycle and must not require calling private application methods from an external script.

### 2. Use a diagnostic session built from existing session policies

A performance test runs with:

- `LIVE_TRANSCRIPTION_PROFILE` (4s chunk / 1s overlap)
- `SessionOutputMode.LIVE_ONLY`
- a selected supported inference configuration

No transcript file is created. Existing local live-view behavior may be shown, but transcript content is not part of the result model or exported report.

### 3. Reuse existing health observations

The runtime's existing `TranscriptionMetrics` remains the authoritative per-window measurement and health classification. The diagnostics layer aggregates observations; it does not create a second RTF/backlog implementation.

The aggregate result should include at least:

- effective audio duration
- observation count
- aggregate RTF
- median RTF
- p95 RTF
- maximum RTF
- maximum queue depth
- healthy and behind counts
- healthy percentage
- longest consecutive behind streak

Aggregation logic should be shared with or extracted from the existing offline summarizer so command-line and in-app reports cannot silently drift.

### 4. Require a meaningful sample before completing

The test must require at least 3 minutes of effective audio by default. Elapsed wall-clock time alone is insufficient because silence or missing capture may not produce enough transcription observations.

Before the threshold is met, the UI reports progress and does not characterize the configuration as complete.

### 5. Detect supported CPU/GPU configurations

The diagnostics screen identifies available hardware and proposes Hearsay's current supported/recommended configurations:

- CPU: `small.en`, `int8`
- NVIDIA GPU: `turbo`, `float16`, only when CUDA-capable NVIDIA inference is available

If GPU inference is unavailable, the UI explains that and does not offer a broken GPU test button.

The design should use existing hardware-detection/model-selection primitives where possible rather than adding a separate GPU-detection stack.

### 6. Human-readable suitability is derived from observed health, not a hidden benchmark score

The existing runtime defines a window as healthy when it satisfies the live profile's RTF and queue thresholds. The diagnostics result may summarize overall suitability in plain language, but the mapping must be explicit and testable.

Initial result categories:

- **Suitable**: sample target met, no sustained inability to keep pace, and aggregate observations are predominantly healthy.
- **Marginal**: sample target met but intermittent backlog/behind streaks indicate limited headroom.
- **Unsuitable**: sample target met and the configuration shows sustained behind behavior or growing backlog.

Exact deterministic thresholds for these aggregate categories must be defined in implementation tests and documented alongside the UI; they must not modify the underlying runtime health thresholds.

### 7. Export only content-free diagnostics

The user can export text and/or JSON containing:

- application version
- OS/CPU metadata
- NVIDIA GPU name when applicable
- model/device/compute type
- profile cadence
- sample duration and observation count
- aggregate metrics
- suitability result

The export must never include transcript text, captured audio, or transcript-file paths.

### 8. Keep diagnostic results local

No automatic telemetry or network upload is introduced. The report is displayed locally and exported only through an explicit user action.

## User Flow

1. User opens the transcription performance diagnostics screen.
2. Hearsay detects available hardware and shows CPU and, when supported, NVIDIA GPU test options.
3. User chooses a configuration and starts the test.
4. Hearsay starts a live-only 4s/1s session and displays sample progress plus current health.
5. User speaks normally or plays representative speech through the selected source.
6. Once at least 3 minutes of effective audio has been observed, the user may stop and complete the test.
7. Hearsay displays a result summary and plain-language suitability assessment.
8. User may export a content-free report.
9. User can repeat the process for the other hardware configuration using the same representative input.

## Failure Handling

- If no usable audio is captured, retain existing no-audio warnings and do not count silence toward the required sample.
- If the selected inference configuration cannot load, end the diagnostic cleanly and explain the configuration failure.
- If the recorder or pipeline fails, surface the existing recording failure behavior and do not produce a misleading completed result.
- If the user cancels early, show an incomplete result rather than suitability classification.

## Testing Strategy

- Unit-test aggregation and suitability classification with synthetic metrics.
- Test sample-progress behavior independently of wall-clock time.
- Test CPU-only hardware presentation and GPU-available presentation with synthetic detector results.
- Test that diagnostics sessions use live-only output and the live profile.
- Test that exported text/JSON contain no transcript content.
- Test cancellation, inference-load failure, and incomplete-sample behavior.
- Preserve existing Windows CI quality gates on Python 3.11 and 3.14.
- Perform the final real Windows CPU and NVIDIA GPU runs through the packaged UI before closing the existing low-latency hardware-validation task.
