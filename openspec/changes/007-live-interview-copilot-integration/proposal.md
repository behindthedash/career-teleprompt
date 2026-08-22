## Why

Changes 001–006 define the event, privacy, knowledge, query, retrieval, and cue-view pieces independently. Epic [`001-live-interview-copilot`](../../epics/001-live-interview-copilot.md) still needs one supported user workflow that starts those pieces together, verifies prerequisites before an interview, manages failures/stale work, and tears them down without changing ordinary Hearsay recording.

## What Changes

- Add an explicit `Interview Copilot` session mode surfaced from the tray/application UI.
- Preflight the selected audio source, local knowledge index, embedding model/cache, optional low-latency profile, and overlay before beginning active listening.
- Start the copilot pipeline as one session: system/remote transcription -> transcript events -> remote utterance/query boundaries -> local retrieval/cue composition -> overlay.
- Default Interview Copilot transcript output to live-only/no-save while allowing an explicit user setting to retain a transcript if desired.
- Prewarm retrieval/index resources before the first question where possible so first-use model loading is not paid after the interviewer finishes speaking.
- Keep every optional stage failure-isolated: retrieval/overlay failure must not crash audio transcription; audio/transcription failure retains upstream loud failure behavior.
- Add manual “retrieve current question” and cue-clear/show/hide controls.
- Clear subscribers, query buffers, retrieval generations, cue state, and sensitive in-memory interview text at session end.
- Record latency/health diagnostics without persisting a full interview transcript in live-only mode.

## Capabilities

### New Capabilities

- `live-interview-copilot-session`: end-to-end start/preflight/runtime/teardown behavior for the local interview copilot and its compatibility with ordinary Hearsay sessions.

### Modified Capabilities

None.

## Impact

- New `src/hearsay/copilot/session.py` orchestration layer.
- `HearsayApp` and `SystemTrayIcon` gain Interview Copilot actions/status.
- Settings gain corpus/index and copilot presentation/session preferences, not personal corpus contents.
- Depends on 001–006 and low-latency change 017 for a useful real-time production profile.

## Product-Level Merge Gate

**Epic acceptance journey completed:** start Interview Copilot -> hear Remote speech -> assemble coherent query -> retrieve truthful local evidence -> show compact cue -> candidate answers -> new query supersedes old work -> session stops -> transient interview state clears -> no transcript persists in default live-only mode.

The same build must still pass an ordinary saved Hearsay recording from the existing `Start Recording` menu.
