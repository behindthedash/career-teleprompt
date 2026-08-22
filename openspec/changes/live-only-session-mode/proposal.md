## Why

Downstream live consumers need Hearsay transcription/events without forcing transcript-file persistence.

## What Changes

- Add a generic session output policy: persisted vs live-only.
- Keep persisted behavior as the default.
- Do not create a transcript writer in live-only mode.
- Keep live view/events available.

## Capabilities

### Modified Capabilities
- `live-only-session`
