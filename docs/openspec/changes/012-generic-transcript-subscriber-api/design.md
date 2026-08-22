## Context

Change 001 deliberately proves the seam with the interview copilot. This change defines the smallest API surface worth supporting independently.

## Decisions

### D1. Keep the contract in `hearsay.events`
No plugin loader or external package ABI. Consumers register callables/objects explicitly.

### D2. Public event fields remain generic
Session id, sequence, source, text, timing, finality. No intent, cue, corpus, or interview metadata.

### D3. Delivery diagnostics are inspectable
Expose subscriber status counters (delivered, dropped, failures, last error/time) without retaining transcript text in diagnostics.

### D4. Backpressure policy is declared at registration
The default remains bounded/drop-newest for optional consumers. A subscriber may choose a larger bound but cannot request blocking delivery on the core poll path.

### D5. Upstream-ready changes remain separable
Tests and docs for this capability contain no optional copilot dependencies.

## Expected Files
- `src/hearsay/events/transcript.py`
- `README.md` extension section or dedicated docs
- `tests/test_transcript_events.py`
