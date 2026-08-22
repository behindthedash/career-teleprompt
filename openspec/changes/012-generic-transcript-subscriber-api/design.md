## Context

Change 001 proves the transcript-event seam inside Hearsay. This change defines the smallest API surface worth supporting for downstream applications while preserving Hearsay as the owner of transcription rather than downstream meaning.

## Decisions

### D1. Keep the contract in `hearsay.events`
No dynamic plugin loader or external package ABI. Consumers import the supported event types and register callables/objects explicitly.

### D2. Public event fields remain generic
Session id, sequence, source, text, timing, finality. No intent, cue, corpus, interview, resume, or other consumer metadata.

### D3. Registration is explicit
Expose a small registration/subscription surface conceptually equivalent to `register_transcript_handler(handler, ...)`. Exact naming may vary during implementation, but downstream consumers must not read Hearsay's private transcript queue directly.

### D4. Delivery diagnostics are inspectable
Expose subscriber status counters (delivered, dropped, failures, last error/time) without retaining transcript text in diagnostics.

### D5. Backpressure policy is declared at registration
The default remains bounded/drop-newest for optional consumers. A subscriber may choose a larger bound but cannot request blocking delivery on the core poll path.

### D6. Importing the API is side-effect-free
Importing `hearsay.events` and its public subscriber types must not start tray UI, capture audio, load Whisper, or initialize a downstream consumer. Change 015 hardens this boundary at package level.

### D7. Upstream-ready changes remain separable
Tests and docs for this capability contain no downstream consumer dependencies.

## Expected Files
- `src/hearsay/events/transcript.py`
- public exports under `src/hearsay/events/__init__.py`
- README extension section or dedicated docs
- `tests/test_transcript_events.py`
- external-consumer smoke test/example
