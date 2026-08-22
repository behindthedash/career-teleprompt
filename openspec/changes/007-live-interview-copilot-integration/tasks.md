## 1. Copilot session orchestration

- [ ] 1.1 Add `InterviewCopilotSession` with explicit dependencies/lifecycle for transcript subscription, utterance assembly, retrieval worker, cue callbacks, and session cancellation/generation. File: `src/hearsay/copilot/session.py`.
- [ ] 1.2 Implement preflight for Remote/system-audio availability, configured corpus/index readiness, embedding-model availability, and selected low-latency profile; return specific blocking diagnostics before active listening. File: `src/hearsay/copilot/session.py`.
- [ ] 1.3 Prewarm the local embedding/retrieval path without logging/persisting corpus or interview text and report startup progress. File: `src/hearsay/copilot/session.py`.
- [ ] 1.4 Implement reverse-order stop/reset that invalidates stale generations, unregisters subscribers, clears utterance/cue state, and prevents late UI callbacks from a dead session. File: `src/hearsay/copilot/session.py`.

## 2. Application and tray integration

- [ ] 2.1 Add `Start Interview Copilot` as a distinct tray action while preserving existing `Start Recording` submenu behavior. File: `src/hearsay/ui/tray.py`.
- [ ] 2.2 Wire HearsayApp to start the selected low-latency audio profile and live-only output by default, create/start the copilot session, and route cue states through `safe_after` to the overlay. File: `src/hearsay/app.py`.
- [ ] 2.3 Add explicit copilot settings for corpus root/index, system-only vs Both capture, transcript-save opt-in, and overlay preferences; never store corpus content itself in config. Files: `src/hearsay/config.py`, `src/hearsay/ui/settings_window.py`.
- [ ] 2.4 Add tray/overlay manual actions for retrieve-current-Remote-buffer, clear cue, and show/hide cue while transcription continues. Files: `src/hearsay/ui/tray.py`, `src/hearsay/app.py`, `src/hearsay/copilot/session.py`.

## 3. Diagnostics and resilience

- [ ] 3.1 Add session-scoped timing/counter diagnostics for transcript event latency, query/retrieval/cue latency, dropped events, stale result suppression, and degraded component state without persisting full interview text. Files: `src/hearsay/copilot/session.py`, logging helpers as needed.
- [ ] 3.2 Make index/retrieval/overlay exceptions degrade only the cue subsystem; preserve upstream fatal handling for actual recorder/transcription failures. Files: `src/hearsay/copilot/session.py`, `src/hearsay/app.py`.

## 4. Integration tests

- [ ] 4.1 Add a dependency-injected end-to-end test: Remote events -> one coherent query -> expected synthetic evidence -> ready cue; Local answer does not trigger automatic query. File: `tests/test_copilot_session.py`.
- [ ] 4.2 Add a two-query forced interleaving proving the older retrieval result cannot replace the newer cue. File: `tests/test_copilot_session.py`.
- [ ] 4.3 Add default live-only teardown/restart tests proving no transcript file, empty transient state, and no stale events/cues in the next session. File: `tests/test_copilot_session.py`.
- [ ] 4.4 Add degraded-index/retrieval/overlay tests proving audio/transcription-facing session state continues and reports cue unavailability.
- [ ] 4.5 Run all existing Hearsay tests and a normal persisted-recording regression path after copilot use.

## 5. Windows acceptance

- [ ] 5.1 Build/install on Windows and run a real Zoom/Teams or controlled loopback simulation with at least two remote questions; capture timing metrics for question end -> transcript -> query -> cue render.
- [ ] 5.2 Verify manual retrieve, overlay hide/show, fast superseding question, stop/restart, and default no transcript artifact.
- [ ] 5.3 Immediately run a standard saved Hearsay recording and verify its existing live view/transcript behavior is unaffected.
