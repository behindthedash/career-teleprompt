## 1. Query candidate model and assembler

- [ ] 1.1 Add `QueryCandidate` with session id, monotonic generation, original text, boundary reason, and timing metadata. Files: `src/hearsay/copilot/__init__.py`, `src/hearsay/copilot/utterances.py`.
- [ ] 1.2 Implement a session-scoped Remote-only utterance buffer with explicit start/reset lifecycle and bounded age/size. File: `src/hearsay/copilot/utterances.py`.
- [ ] 1.3 Implement punctuation/debounce, pause, maximum-bound, and manual-flush completion paths using an injected/fakeable clock rather than test sleeps. File: `src/hearsay/copilot/utterances.py`.
- [ ] 1.4 Implement bounded duplicate suppression over normalized recently emitted utterances while preserving original text for the query. File: `src/hearsay/copilot/utterances.py`.

## 2. Transcript-event integration

- [ ] 2.1 Add a transcript-event handler that accepts Remote events, ignores Local events for automatic query assembly, and resets on session replacement. File: `src/hearsay/copilot/utterances.py`.
- [ ] 2.2 Expose emitted query candidates through a small callback/queue interface that does not import the knowledge index or UI packages. File: `src/hearsay/copilot/utterances.py`.

## 3. Tests

- [ ] 3.1 Cover a multi-segment question producing exactly one combined candidate, a `?` boundary, a pause boundary, a max-bound flush, and manual flush. File: `tests/test_remote_question_boundaries.py`.
- [ ] 3.2 Cover interleaved Local speech, repeated overlap text, duplicate completion signals, monotonic generations, and clean state after a session restart. File: `tests/test_remote_question_boundaries.py`.

## 4. Verification

- [ ] 4.1 Replay a synthetic interview transcript fixture and record candidate count versus Remote event count; verify retrieval would be invoked per coherent turn rather than per segment.
