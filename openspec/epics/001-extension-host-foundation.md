# Epic 001 — Extension Host Foundation

## Business Objective

Turn Hearsay's finalized local transcription output into a small, reusable extension surface without coupling the host to any one downstream application.

The first consumer will be an interview copilot, but this epic must remain useful if that consumer is removed entirely.

## Architectural Principles

1. **Hearsay owns speech; consumers own meaning.** The host emits finalized source-tagged speech. It does not classify interviewer intent, perform RAG, or generate domain-specific cues.
2. **Explicit registration first.** The supported v1 extension model is an in-process subscriber/handler API, not dynamic package discovery, a marketplace, or network webhook transport.
3. **Never block transcription.** Subscriber delivery is bounded and failure-isolated.
4. **Session identity is explicit.** Consumers can distinguish sessions and ordering without depending on Whisper internals.
5. **Live use is a host capability.** Hearsay supports low-latency profiles and live-only/no-save sessions generically rather than exposing interview-specific session modes.
6. **Backward compatibility is a merge gate.** Normal saved-transcript Hearsay behavior remains intact.

## Feature Decomposition

### 001 — Transcript Event Extension Boundary
Expose immutable finalized transcript events downstream of cleanup/deduplication while preserving existing writer/live-view paths.

### 012 — Generic Transcript Subscriber API
Promote the event seam into a small supported public API with explicit registration, declared backpressure behavior, diagnostics, and generic event fields.

Representative consumer usage:

```python
subscription = register_transcript_handler(
    name="my-extension",
    handler=handler,
    sources={"Remote"},
)
```

The concrete API may differ, but the ownership boundary must not.

### 013 — Generic Live-Only Session Mode
Allow transcription/events without persisted transcript output. This replaces the earlier interview-specific `002-ephemeral-copilot-session` concept.

### 017 — Low-Latency Live Transcription
Add session-selectable shorter transcription windows plus observable backlog/throughput while preserving the ordinary 30-second recording profile.

## Non-Goals

- No resume/project knowledge index.
- No PostgreSQL/pgvector schema.
- No interviewer question detector.
- No cue generation or interview overlay.
- No speech-following teleprompter.
- No target-company data.
- No webhook, WebSocket, localhost server, or external process ABI in v1.
- No dynamic plugin discovery.

## Acceptance Journey

1. A normal Hearsay recording behaves as it does today.
2. A live-only session can run without producing a transcript artifact.
3. Finalized Remote/Local speech is published as ordered generic transcript events.
4. A registered diagnostic consumer receives events without accessing Hearsay UI internals.
5. A slow/failing consumer cannot block or crash transcription.
6. A low-latency profile materially reduces finalized-text delay on supported hardware and reports when it cannot keep up.
7. Session teardown prevents stale events from leaking into a later session.

## Success Metrics

- Existing normal-recording regression tests remain green.
- Subscriber faults do not terminate transcription.
- Delivery diagnostics expose drops/failures without retaining transcript text.
- Windows profiling demonstrates a useful low-latency profile with bounded backlog.
- The public event contract contains no interview/RAG-specific fields.

## Dependencies

`001` establishes the initial seam. `012` hardens it into the supported subscriber API. `013` and `017` can proceed independently once session configuration boundaries are understood.
