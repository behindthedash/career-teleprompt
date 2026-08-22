## Context

The feature components are intentionally independent: 001 transcript events, 002 live-only output, 003 local knowledge index, 004 remote query assembly, 005 retrieval/cue composition, 006 cue overlay, and 017 a low-latency transcription profile. `HearsayApp` should not absorb all their state directly or the fork will become difficult to rebase upstream.

## Goals / Non-Goals

**Goals:**
- One user-facing session lifecycle with deterministic startup/teardown ordering.
- Preflight/prewarm before active interview listening.
- Failure isolation and latest-query-wins behavior preserved end to end.
- Ordinary Hearsay session paths remain simple and independent.

**Non-Goals:**
- No cloud LLM answer generator.
- No Zoom/Teams API/bot integration.
- No automatic speaking/keystroke injection.
- No general workflow engine/plugin framework.

## Decisions

### D1. Add a narrow `InterviewCopilotSession` orchestrator

Create `src/hearsay/copilot/session.py` that owns only copilot-specific components and lifecycle. `HearsayApp` constructs/starts/stops it and remains the owner of audio/transcription. The copilot session registers transcript subscribers and publishes UI state callbacks; it does not own audio devices.

### D2. Add a distinct tray action

Extend `SystemTrayIcon` with `Start Interview Copilot` while retaining the existing `Start Recording -> System Audio/Microphone/Both` menu untouched. During a copilot session the tray indicates active recording/listening and offers Stop plus cue/live-view controls.

### D3. Preflight and prewarm before marking ready

Preflight resolves the configured corpus/index, validates metadata, opens the persisted index, loads/caches the embedding adapter, and ensures the selected transcription profile/audio devices can start. The local retrieval model is prewarmed with a tiny synthetic/internal query before the meeting session is considered ready so first-question latency is not dominated by model initialization.

No actual interview/corpus text is logged during prewarm.

### D4. Copilot defaults to Both capture when a microphone is configured, but requires Remote/system audio

Remote/system audio is mandatory for automatic interviewer retrieval. A configured microphone is useful for source separation and future teleprompter behavior; `Both` mode can continue with system audio if the mic fails under existing recorder behavior. Settings may allow system-only copilot capture. The query assembler consumes only Remote events automatically.

### D5. Copilot output defaults live-only

Start audio with `SessionOutputMode.live_only` by default. A user preference can explicitly request saved transcript output, but the UI must label that state before start. The corpus/index and cue overlay do not persist interview transcript text.

### D6. Wire a one-directional pipeline with explicit generations

```text
AudioRecorder / low-latency profile
  -> TranscriptionPipeline
    -> TranscriptEventDispatcher
      -> RemoteUtteranceAssembler
        -> QueryCandidate(session,generation)
          -> InterviewRetrievalWorker
            -> InterviewCue(session,generation)
              -> safe_after -> CueOverlayWindow
```

Each stage only knows its immediate contract. Query generations enforce latest-query-wins through retrieval/UI.

### D7. Diagnostics are metrics, not transcript storage

Track timings/counters such as audio-window end -> transcript event, query emission -> retrieval start, retrieval duration, cue render time, dropped subscriber events, and stale result count. Store aggregate/session diagnostic metrics only when logging is enabled; do not persist complete questions/answers in live-only mode.

### D8. Teardown is reverse-order and session-scoped

On stop: stop accepting new query work; invalidate current generation; unregister transcript subscribers; stop retrieval/utterance workers; clear cue/utterance transient state; then allow existing Hearsay recorder/pipeline teardown to flush according to the session output policy. UI late callbacks check session identity before rendering.

## Risks / Trade-offs

- **Prewarm increases startup time.** Better before the interview than after the first question; status text must make the phase explicit.
- **Both-source capture adds mic work even though MVP retrieval uses only Remote.** It improves source separation/future speech-following; system-only remains an option.
- **A component can degrade mid-session.** Keep degraded state explicit and avoid auto-restart loops that could destabilize audio.

## Files Expected to Change

- `src/hearsay/copilot/session.py`
- `src/hearsay/app.py`
- `src/hearsay/ui/tray.py`
- `src/hearsay/config.py`
- `src/hearsay/ui/settings_window.py`
- integration tests under `tests/test_copilot_session.py`
- manual Windows acceptance helper/notes under `scripts/` as appropriate

## Verification

Use dependency-injected fake transcript events/index/retrieval/UI for deterministic integration tests, plus one Windows manual acceptance run with real WASAPI/Whisper. The acceptance run must exercise at least two interviewer turns, a fast superseding query, manual retrieval, stop/restart, default no-save behavior, and a subsequent ordinary saved Hearsay recording.
