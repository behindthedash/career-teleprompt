## Context

Change 001 provides finalized per-segment `TranscriptEvent` objects with source and session identity. This change is a pure in-memory routing layer between those events and later retrieval. It must not know about embeddings/vector storage or UI widgets.

## Goals / Non-Goals

**Goals:**
- Reduce retrieval frequency to coherent interviewer turns.
- Preserve multi-sentence/multi-segment question context.
- Provide explicit stale-work identity for downstream consumers.

**Non-Goals:**
- No semantic answer generation.
- No speaker diarization beyond Hearsay's Remote/Local source distinction.
- No LLM-based question classifier in the first implementation.

## Decisions

### D1. Implement a deterministic `RemoteUtteranceAssembler`

A transcript-event subscriber accepts only `source == system/Remote` events into a session-scoped buffer. Local events do not contribute to automatic query text. The assembler exposes emitted `QueryCandidate` objects through a separate callback/queue boundary.

### D2. Completion uses layered heuristics

A candidate closes when any of these occurs:
1. terminal/question punctuation plus a short debounce interval with no immediately continuing Remote text;
2. a configured remote-silence/pause timer after the most recent Remote event;
3. maximum buffered age/character/token bound;
4. explicit manual flush.

Because current transcript events are finalized chunks rather than streaming tokens, the initial implementation derives pause from event arrival/timing information; low-latency chunking is handled separately by change 017.

### D3. Normalize before duplicate comparison, not before retrieval text

For duplicate detection create a comparison form that lowercases, collapses whitespace, and strips non-semantic punctuation. Preserve the original assembled text in `QueryCandidate` so retrieval receives natural language. Use a bounded recent-emission cache per session and a high-similarity lexical comparison; do not invoke embeddings just to decide whether to search embeddings.

### D4. Generations are monotonic per session

`QueryCandidate` includes `session_id`, `generation`, `text`, boundary reason, and timing. Generation starts at one for each recording session and increments for every emitted candidate. Downstream change 005 uses `(session_id, generation)` as the supersession key.

### D5. Buffer bounds fail toward usefulness

If max age/size is hit, emit the best accumulated text with a `max_bound` reason rather than silently discarding a long interviewer prompt. Empty/near-empty buffers are not emitted.

## Risks / Trade-offs

- **Questions without punctuation can be delayed.** Pause/max-bound flush provides recovery.
- **Statements like “tell me about…” are not grammatical questions.** The assembler emits coherent interviewer turns, not only text ending in `?`; later retrieval determines usefulness.
- **Heuristics may emit too early if chunks are slow.** Change 017 reduces live chunk latency; fixture thresholds remain configurable.

## Files Expected to Change

- `src/hearsay/copilot/__init__.py`
- `src/hearsay/copilot/utterances.py`
- `tests/test_remote_question_boundaries.py`

## Verification

Use deterministic synthetic timestamped events and a fake clock to prove multi-segment assembly, punctuation+debounce, pause flush, max-bound flush, manual flush, Local exclusion, duplicate suppression, generation ordering, and session reset without sleeping in unit tests.
