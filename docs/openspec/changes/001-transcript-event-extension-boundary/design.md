## Context

Upstream Hearsay already has a clean producer/consumer boundary: `TranscriptionPipeline` pushes finalized `TranscriptionResult` objects to `HearsayApp._transcript_queue`, and `_poll_transcripts()` drains that queue every `LIVE_VIEW_POLL_MS` before updating `MarkdownWriter` and `LiveTranscriptWindow`. `TranscriptionResult.segments` already carry source labels after deduplication and echo filtering. The safest extension point is therefore downstream of the pipeline, not in `AudioRecorder` or Whisper inference.

## Goals / Non-Goals

**Goals:**
- Expose finalized source-tagged speech through a small reusable contract.
- Prevent optional consumers from blocking the tkinter poll loop or core transcription path.
- Give every event a durable-in-memory recording-session identity.
- Preserve writer/live-view behavior byte-for-byte where existing tests cover it.

**Non-Goals:**
- No dynamic plugin discovery/marketplace.
- No network/webhook transport.
- No migration of built-in writer/live-view consumers onto the new dispatcher yet.
- No partial/streaming Whisper tokens; events represent finalized existing pipeline output.

## Decisions

### D1. Publish downstream of `TranscriptionPipeline`

Publish when `HearsayApp` drains a finalized `TranscriptionResult`, after the pipeline has performed overlap deduplication, echo suppression, segment sorting, and source tagging. This keeps event consumers from reproducing speech-cleanup logic and leaves audio/Whisper threads untouched.

### D2. Normalize to one immutable event per finalized segment

Introduce a frozen `TranscriptEvent` dataclass with fields conceptually equivalent to:

```text
session_id: str
sequence: int
chunk_index: int
source: str
text: str
start_time: float | None
end_time: float | None
final: bool = True
```

`sequence` is monotonic within one recording session and is the primary ordering field. `chunk_index`/timing retain upstream context. Do not duplicate the full `TranscriptionResult` as the public contract; consumers that need rich internals can be added later without making every subscriber depend on Whisper-specific structures.

### D3. Use an explicit dispatcher with bounded per-subscriber workers

Create `TranscriptEventDispatcher` under `src/hearsay/events/`. Registration is explicit in Python; no package scanning. Each subscriber gets a bounded `queue.Queue` and a daemon `StoppableThread` worker. `publish()` uses non-blocking enqueue and therefore never waits on retrieval or UI work.

When a subscriber queue is full, the dispatcher logs a structured warning including subscriber name, session, and dropped sequence. The initial policy drops the incoming event rather than blocking the producer. Interview-specific consumers can use larger capacities and their own stale-work semantics later.

### D4. Keep writer and live view on the existing direct path

For this first seam `_poll_transcripts()` continues to call `MarkdownWriter.append()` and `LiveTranscriptWindow.append_text()` directly, then publishes normalized events from the same drained result. This minimizes regression surface and avoids pretending two existing consumers require a generalized plugin framework.

### D5. Session identity is separate from `_session_gen`

`_session_gen` is an integer cancellation guard used to invalidate slow model loads. Introduce a UUID string for external event identity when a recording starts. The UUID is captured by the event adapter and cleared at teardown; `_session_gen` keeps its existing purpose.

### D6. Subscriber lifecycle is explicit

The application owns one dispatcher. Subscribers are registered before or during a session and may be removed. Session teardown calls a dispatcher session-reset/flush operation that prevents stale queued events from being presented as current-session data. App shutdown stops subscriber workers cleanly.

## Risks / Trade-offs

- **Events can be dropped for an overloaded extension.** This is preferable to blocking transcription. The condition is observable, and later critical consumers can add reconciliation if needed.
- **Per-subscriber threads add lifecycle complexity.** The number of consumers is expected to be very small; using the existing `StoppableThread` convention keeps the model familiar and isolates latency cleanly.
- **Built-in outputs and subscribers are not one unified pipeline.** Deliberate for now: the new seam is proven before refactoring stable upstream behavior.

## Files Expected to Change

- `src/hearsay/events/__init__.py`
- `src/hearsay/events/transcript.py`
- `src/hearsay/app.py`
- `tests/test_transcript_events.py`
- existing pipeline/writer regression tests only if fixtures/helpers need reuse

## Verification

Unit tests use synthetic `TranscriptionResult` objects; they require no audio hardware. Manual verification starts a normal Windows recording, confirms the transcript file/live window still update, and checks a diagnostic subscriber receives matching Remote/Local events.
