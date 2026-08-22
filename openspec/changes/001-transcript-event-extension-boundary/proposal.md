## Why

Epic [`001-extension-host-foundation`](../../epics/001-extension-host-foundation.md) needs a stable point where finalized `Remote` and `Local` speech can be consumed by optional downstream applications without coupling those consumers to Hearsay application/UI internals. Today `HearsayApp._poll_transcripts()` drains each `TranscriptionResult` directly into the markdown writer and live transcript UI.

## What Changes

- Add a generic finalized-transcript event contract carrying session identity, source, text, chunk/order information, and timing.
- Add a small subscriber/dispatcher boundary so optional consumers can receive finalized transcript events without reading UI widgets or transcript files.
- Publish events from the existing application transcript-drain path after transcription has completed and source/echo/dedup processing has already occurred.
- Preserve the current markdown writer and live-view behavior as direct built-in consumers for this change; do not migrate them onto a generalized plugin framework.
- Isolate subscriber failures and bounded-queue overflow so an extension cannot block or crash ordinary transcription.
- Clear subscriber/session state at teardown so events from one recording cannot leak into the next.

## Capabilities

### New Capabilities

- `transcript-events`: observable finalized-transcript events and subscription behavior, including ordering, source identity, session isolation, and failure isolation.

### Modified Capabilities

None. There are no archived OpenSpec capabilities yet; ordinary Hearsay behavior is preserved rather than redefined.

## Impact

- New event module under `src/hearsay/events/`.
- `HearsayApp` gains a recording-session identifier and publishes normalized events while draining the existing transcript queue.
- No audio-capture, Whisper inference, writer-format, or live-view contract changes.
- Tests add synthetic `TranscriptionResult` fixtures and slow/failing subscriber coverage.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `faster-whisper produces source-tagged transcript -> optional downstream consumers can receive finalized Remote/Local speech through a generic event seam`.

The change is complete only when an extension subscriber receives ordered source-tagged events during a normal recording test while markdown/live-view behavior remains unchanged and a failing subscriber does not interrupt the session.
