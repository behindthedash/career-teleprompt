## Why

Epic [`001-live-interview-copilot`](../../../docs/specs/epics/001-live-interview-copilot.md) requires a privacy-preserving session in which live speech can drive cues without leaving an interview transcript on disk. Hearsay already avoids raw-audio persistence, but every normal recording currently constructs a `MarkdownWriter` and finalizes a transcript file.

## What Changes

- Add a session-scoped output policy with a live-only/no-transcript option in addition to the existing persisted-transcript behavior.
- Keep persisted transcript output as the default for ordinary Hearsay recording.
- In live-only mode, continue audio capture, local Whisper transcription, live transcript display, and transcript-event publication while never creating/finalizing a markdown transcript artifact.
- Make the active output policy explicit in session state so teardown and failure paths cannot accidentally persist a live-only session.
- Clear transient live-only session state at stop/quit; this change does not retain or archive interview transcript text elsewhere.

## Capabilities

### New Capabilities

- `ephemeral-transcription-session`: session output behavior that allows live transcription and extensions without transcript persistence while preserving ordinary saved-transcript sessions.

### Modified Capabilities

None.

## Impact

- `HearsayApp` session startup/teardown accepts an output policy instead of assuming a writer always exists.
- Configuration/session model gains an explicit persisted-versus-live-only value; the default remains persisted.
- Existing raw-audio behavior is unchanged: audio remains memory-only.
- No retrieval, corpus, or cue UI is added by this change.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `session ends -> transient buffers are cleared -> no raw audio is persisted -> in ephemeral mode, no interview transcript is persisted`.

A live-only session must provide normal live transcript/events during the meeting and leave no newly created transcript file after successful stop, recorder failure, or application quit.
