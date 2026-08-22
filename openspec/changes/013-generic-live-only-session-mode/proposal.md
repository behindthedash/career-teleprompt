## Why

Epic [`001-extension-host-foundation`](../../epics/001-extension-host-foundation.md) needs a generic way to run live transcription/events without creating a transcript file. That behavior is useful for any ephemeral consumer workflow and should be owned by Hearsay rather than reimplemented by each downstream application.

This change supersedes the earlier interview-specific `002-ephemeral-copilot-session` proposal.

## What Changes

- Define a generic session output policy with persisted and live-only modes.
- Make live-only selectable independently of any particular downstream consumer.
- Preserve persisted transcript output as the existing default.
- In live-only mode, continue audio capture, local transcription, live display, and transcript-event publication without creating/finalizing a transcript artifact.
- Document that raw audio remains non-persistent in either mode.

## Capabilities

### New Capabilities
- `generic-live-only-session`: user-selectable live transcription without transcript-file persistence.

## Impact

Host session/output behavior only. No interview, RAG, knowledge-store, or consumer UI behavior is added.

## Product-Level Merge Gate

A live-only Hearsay session publishes the same supported live events while leaving no new Hearsay transcript file after normal stop, recorder failure, or application quit; ordinary recording continues to persist by default.
