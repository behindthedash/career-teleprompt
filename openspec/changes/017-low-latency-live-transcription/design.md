## Context

`src/hearsay/constants.py` currently fixes `CHUNK_DURATION_S = 30` and `OVERLAP_DURATION_S = 1`. `AudioRecorder._capture_windows()` checks the global chunk duration every 0.5 seconds and queues each `AudioChunk` to a max-size application queue. `TranscriptionPipeline` processes chunks sequentially and logs per-chunk transcription elapsed time. `LiveTranscriptWindow` currently says text appears with approximately 30–60 seconds of delay.

The event/RAG layers cannot compensate for a 30-second producer cadence. The smallest change is to make window cadence a session parameter and measure whether inference keeps up.

## Goals / Non-Goals

**Goals:**
- Preserve 30-second behavior for ordinary Hearsay.
- Provide a practical shorter-window profile for live interview use.
- Measure and surface lag instead of guessing about hardware performance.

**Non-Goals:**
- No streaming-token Whisper rewrite.
- No automatic model download/switch during an active interview.
- No replacement speech-to-text vendor/cloud API.

## Decisions

### D1. Introduce immutable session transcription profiles

Define `TranscriptionProfile` with window duration, overlap duration, queue/backlog thresholds, and an identifier. Initial profiles:

- `normal`: 30s window / existing overlap semantics.
- `live`: 4s window / 1s overlap initially.

The exact live value remains configurable in code/settings for profiling, but 4s is the first default because it materially reduces capture wait while leaving enough speech for Whisper context. Do not change the user's selected Whisper model automatically.

### D2. Parameterize `AudioRecorder` and `_SourceBuffer`

`AudioRecorder.__init__` accepts `window_duration_s` and `overlap_duration_s` with current constants as defaults. Each source buffer receives overlap samples derived from the recorder instance. `_capture_windows()` uses the instance duration. Existing call sites require no change unless selecting the live profile.

### D3. Measure real-time factor and queue age/depth

The pipeline already measures transcription elapsed time. Extend diagnostics with approximate audio duration and real-time factor (`processing_seconds / new_audio_seconds`) plus input queue depth. The app/session layer derives `healthy`/`behind` state from sustained thresholds rather than one slow chunk.

Do not log full transcript text as part of performance metrics.

### D4. Bound backlog without silently changing the ordinary path

Keep normal-session queue behavior unchanged. Live sessions use a profile-specific bounded queue and health threshold. If the pipeline falls severely behind, surface a warning/recommendation to use a faster Whisper model/GPU or less aggressive live window. Do not automatically discard queued interview audio in the initial implementation; if hard queue capacity is reached, use the existing explicit queue-full behavior and make the degraded state loud.

A later measured change may adopt latest-audio/drop policy only if tests show it is preferable to preserving questions.

### D5. Preserve existing overlap dedup

The existing pipeline `_deduplicate()` tail matching remains the authority for overlap text. Add shorter-window fixtures because more boundaries increase the chance of repeated fragments. Do not invent a second dedup path for live mode.

### D6. Make delay UI profile-aware

Replace the hard-coded `LiveTranscriptWindow` 30–60 second sentence with a status supplied by the active profile/session. Normal mode may retain the existing expectation; live mode shows healthy/behind state and measured recent processing where useful.

## Risks / Trade-offs

- **Short windows reduce Whisper context/accuracy.** Measure against fixture/manual speech; 4s is adjustable and normal mode remains available.
- **CPU small.en may still be too slow.** The product must detect/report this before relying on cues; users can select a faster model/profile without hidden auto-switching.
- **More chunks increase overlap/dedup opportunities.** Add focused regression fixtures.
- **Queue-full policy can still increase latency before failure.** Health thresholds warn well before hard capacity; later tuning is data-driven.

## Files Expected to Change

- `src/hearsay/session.py` or `src/hearsay/transcription/profile.py`
- `src/hearsay/audio/recorder.py`
- `src/hearsay/transcription/pipeline.py`
- `src/hearsay/app.py`
- `src/hearsay/ui/live_view.py`
- `tests/test_low_latency_transcription.py`
- existing pipeline/manual-device tests

## Verification

Unit tests parameterize recorder timing with injected/fake time where practical and use audio/transcription stubs to verify 4s-vs-30s emission, final flush, ordering, overlap dedup, and lag-state transitions. Windows manual profiling records question-end-to-final-text latency on CPU and, when available, GPU while also running a normal recording regression.
