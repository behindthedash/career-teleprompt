## Why

A live interview should not launch semantic retrieval for every Whisper segment. Epic [`001-live-interview-copilot`](../../epics/001-live-interview-copilot.md) needs a lightweight boundary that assembles finalized Remote events into coherent interviewer intents/questions and emits a bounded query only when enough meaning is available.

## What Changes

- Consume finalized `Remote` transcript events from change 001 and ignore `Local` speech for automatic interviewer-query detection.
- Maintain a bounded in-memory utterance buffer across adjacent remote segments.
- Emit query candidates on configurable completion signals such as question punctuation, a remote-speech pause, maximum utterance age/size, or explicit manual request.
- Debounce/suppress duplicate query candidates caused by overlapping/repeated transcription.
- Assign monotonic query generations so downstream retrieval can discard stale results when a newer interviewer utterance supersedes them.
- Use deterministic heuristics first; no LLM/classifier is required for the MVP.

## Capabilities

### New Capabilities

- `remote-query-boundaries`: coherent remote utterance assembly, automatic/manual query emission, bounded buffering, duplicate suppression, and query-generation semantics.

### Modified Capabilities

None.

## Impact

- New `src/hearsay/copilot/utterances.py` module subscribing to transcript events.
- No retrieval/index dependency is required by this change.
- Synthetic transcript-event fixtures cover multi-segment questions, statements, pauses, repetitions, and Local/Remote interleaving.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `Remote transcript events -> coherent interviewer question`.

The change must prove one useful query per coherent interviewer turn rather than one query per transcription segment, while Local user speech does not automatically create interviewer queries.
