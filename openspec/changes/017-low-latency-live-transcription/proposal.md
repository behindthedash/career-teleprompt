## Why

Epic [`001-extension-host-foundation`](../../epics/001-extension-host-foundation.md) needs a live transcription profile suitable for downstream real-time consumers. Upstream Hearsay currently cuts audio only every `CHUNK_DURATION_S = 30` seconds and its live UI warns of roughly 30–60 seconds of delay, which is too slow for applications that need finalized speech while it is still actionable.

## What Changes

- Add a session-scoped transcription profile so normal Hearsay retains its existing 30-second batch window while supported live sessions can request shorter windows.
- Make `AudioRecorder` window duration configurable per instance instead of using only the global 30-second constant.
- Keep overlap/dedup behavior intact for shorter windows and preserve final partial-window flush on stop.
- Add transcription throughput/backlog metrics for live profiles so Hearsay can report when the selected Whisper model/hardware cannot keep up with the requested cadence.
- Bound live-profile audio queue/backlog behavior and surface degradation instead of silently accumulating unbounded delay.
- Update live-status messaging so it does not always claim the upstream 30–60 second delay when a low-latency profile is active.
- Do not replace faster-whisper or implement speculative token streaming in this change.

## Capabilities

### New Capabilities

- `low-latency-transcription`: session-selectable shorter finalized-audio windows, compatibility with normal 30-second recording, and observable lag/backpressure for real-time use.

### Modified Capabilities

None.

## Impact

- `AudioRecorder` gains instance-level window/overlap configuration while defaulting to current constants.
- Hearsay's supported session/profile API can select a live profile without exposing recorder internals to consumers.
- `TranscriptionPipeline`/app diagnostics expose processing time and backlog health.
- Existing audio device/retry/silence behavior is unchanged.

## Product-Level Merge Gate

**Epic acceptance step advanced:** downstream consumers can obtain finalized transcript events on a materially lower-latency cadence without bypassing Hearsay host APIs.

The change is accepted only after Windows profiling demonstrates materially lower first-finalized-text latency in the live profile and proves normal 30-second Hearsay output remains unchanged.
