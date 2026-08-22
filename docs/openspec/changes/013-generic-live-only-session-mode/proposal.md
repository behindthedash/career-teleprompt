## Why

Change 002 adds transcript-ephemeral behavior for Interview Copilot. A no-save/live-only mode is useful beyond interviews for captions, accessibility, demos, and privacy-sensitive meetings, so Epic 003 should express it generically.

## What Changes

- Rename/present the output policy generically as persisted vs live-only recording.
- Make live-only selectable independently of Interview Copilot.
- Preserve persisted transcript as the existing default.
- Document that raw audio remains non-persistent in either mode.

## Capabilities

### New Capabilities
- `generic-live-only-session`: user-selectable live transcription without transcript-file persistence.

## Impact

Generalizes change 002 without adding interview behavior. Potential upstream contribution: yes.
