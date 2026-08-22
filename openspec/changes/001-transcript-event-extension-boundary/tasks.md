## 1. Event contract and dispatcher

- [ ] 1.1 Add a frozen `TranscriptEvent` model with session id, monotonic per-session sequence, chunk index, source, text, timing, and finalized state. Files: `src/hearsay/events/__init__.py`, `src/hearsay/events/transcript.py`.
- [ ] 1.2 Implement explicit subscriber registration/removal and bounded per-subscriber worker queues using the existing `StoppableThread` convention; a subscriber exception or full queue must be logged and isolated without blocking `publish()`. File: `src/hearsay/events/transcript.py`.
- [ ] 1.3 Add dispatcher lifecycle methods for beginning/resetting a recording session and clean worker shutdown; stale queued events must not be relabeled into a later session. File: `src/hearsay/events/transcript.py`.

## 2. Application wiring

- [ ] 2.1 Add a UUID recording-session identity and per-session event sequence to `HearsayApp` without changing the existing `_session_gen` cancellation behavior. File: `src/hearsay/app.py`.
- [ ] 2.2 Adapt each finalized `TranscriptionResult` segment drained by `_poll_transcripts()` into an ordered `TranscriptEvent` and publish it after existing writer/live-view handling. File: `src/hearsay/app.py`.
- [ ] 2.3 Ensure stop/restart/quit paths reset event session state and stop dispatcher workers without extending audio-device teardown ordering. File: `src/hearsay/app.py`.

## 3. Tests

- [ ] 3.1 Add unit coverage proving Remote/Local source identity, monotonic ordering, timing fields, and new session ids across restart using synthetic transcript results. File: `tests/test_transcript_events.py`.
- [ ] 3.2 Add a failing-subscriber test and a deliberately slow bounded-queue test proving core publication returns without waiting and overflow/failure is observable. File: `tests/test_transcript_events.py`.
- [ ] 3.3 Run the existing pipeline/writer regression test to prove ordinary transcript formatting remains unchanged. File: `tests/test_pipeline_writer.py`.

## 4. Verification

- [ ] 4.1 Run source-level test suite including `python tests/test_pipeline_writer.py` and the new transcript-event tests.
- [ ] 4.2 On Windows, run one normal system-audio or Both recording and verify the live transcript and saved markdown still work while a diagnostic subscriber receives ordered events; stop and start a second session and confirm the session id changes.
