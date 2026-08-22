## 1. Session output model

- [ ] 1.1 Add a session-scoped output-mode enum/value with `persist_transcript` and `live_only`; default call sites must preserve `persist_transcript`. File: `src/hearsay/session.py` (or the smallest existing module that owns recording-session state).
- [ ] 1.2 Thread the chosen output mode through recording startup and captured teardown state so it cannot change mid-session. File: `src/hearsay/app.py`.

## 2. Live-only behavior

- [ ] 2.1 Construct `MarkdownWriter` only for persisted sessions; do not create a temporary transcript file for live-only sessions. File: `src/hearsay/app.py`.
- [ ] 2.2 Keep live-view updates and transcript-event publication active when no writer exists, including when teardown drains final queued results. File: `src/hearsay/app.py`.
- [ ] 2.3 Audit stop, quit, recorder-fatal, and empty-session paths to ensure none creates a transcript fallback for live-only mode and none expands transcript text in logs.

## 3. Tests

- [ ] 3.1 Add a persisted-session regression test proving normal output still creates/finalizes the expected markdown artifact. File: `tests/test_ephemeral_session.py`.
- [ ] 3.2 Add live-only tests for normal stop, application quit, and simulated recorder failure proving no transcript file is created while finalized text still reaches live/event consumers. File: `tests/test_ephemeral_session.py`.
- [ ] 3.3 Run existing pipeline/writer tests to confirm no formatting/finalization regression for persisted mode. File: `tests/test_pipeline_writer.py`.

## 4. Verification

- [ ] 4.1 Run all source-level unit/regression tests with temporary output directories and confirm live-only tests leave them empty.
- [ ] 4.2 On Windows, start one persisted recording and one live-only recording through a temporary harness/call site; verify the former saves normally and the latter displays live speech but creates no transcript artifact.
