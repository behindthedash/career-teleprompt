# Epic 001 — Extension Host Foundation

## Business Objective

Turn Hearsay's finalized local transcription output into a small reusable host surface that downstream applications can consume without coupling Hearsay to any one use case.

## Architectural Principles

1. **Hearsay owns speech; consumers own meaning.** The host emits finalized source-tagged speech and generic session state only.
2. **Explicit registration first.** The supported v1 integration is an in-process Python subscriber/handler API, not dynamic plugin discovery or network webhook transport.
3. **Never block transcription.** Subscriber delivery is bounded and failure-isolated.
4. **Session identity is explicit.** Consumers can reason about ordering and teardown without Whisper internals.
5. **Live use is generic.** Live-only/no-save and lower-latency profiles are host capabilities, not interview-specific modes.
6. **Backward compatibility is a gate.** Existing normal saved-transcript behavior remains intact.

## Capabilities

### Transcript Events and Subscriber API
Expose finalized immutable transcript events downstream of source labeling, overlap deduplication, and echo suppression. Support explicit handler registration, source filters, bounded delivery, diagnostics, and teardown.

Representative usage:

```python
subscription = register_transcript_handler(
    name="my-consumer",
    handler=handler,
    sources={"Remote"},
)
```

The concrete API may differ, but the ownership boundary must not.

### Live-Only Session
Allow live transcript/event consumption without Hearsay creating a saved transcript file.

### Low-Latency Transcription
Allow a session to request shorter transcription windows with observable processing/backlog health while preserving the normal recording cadence.

## Non-Goals

- No knowledge index, embedding model, vector store, or database provider.
- No interviewer question detector or semantic interpretation.
- No cue generation, interview overlay, or teleprompter.
- No webhook/WebSocket/local server protocol in v1.
- No dynamic plugin marketplace/discovery.

## Acceptance Journey

1. Normal Hearsay recording behaves as before.
2. A live-only session can run without producing a transcript artifact.
3. Finalized Remote/Local speech is published as ordered generic events.
4. A registered external consumer receives events without private Hearsay internals.
5. Slow/failing consumers cannot block or crash transcription.
6. A low-latency profile materially reduces finalized-text delay on supported hardware and reports when it cannot keep up.
7. Teardown prevents stale events from leaking into later sessions.
