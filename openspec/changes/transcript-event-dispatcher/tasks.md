## 1. Event model
- [x] 1.1 Add immutable `TranscriptEvent` and source / session typing.
- [x] 1.2 Add per-session monotonic sequence behavior.

## 2. Publication
- [x] 2.1 Create session identity at recording start.
- [x] 2.2 Publish events from the finalized transcript-drain boundary.
- [x] 2.3 Ensure teardown cannot leak prior-session events.

## 3. Regression tests
- [ ] 3.1 Verify Remote/Local event fields and ordering.
- [ ] 3.2 Verify normal markdown/live-view behavior remains unchanged.
- [ ] 3.3 Verify session restart isolation.
