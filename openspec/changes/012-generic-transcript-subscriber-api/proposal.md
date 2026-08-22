## Why

Change 001 introduces the transcript-event seam. Epic [`001-extension-host-foundation`](../../epics/001-extension-host-foundation.md) needs that seam hardened into a small supported API that external consumers can use without depending on Hearsay UI internals or consumer-specific assumptions.

## What Changes

- Document the public event/subscriber contract and lifecycle.
- Add explicit subscriber naming, bounded delivery policy, session reset, and diagnostics.
- Keep the API free of RAG, interview, resume, cue, teleprompter, or other consumer-domain concepts.
- Add compatibility tests proving ordinary writer/live-view output is unaffected.
- Provide a minimal external-consumer example using only supported Hearsay imports.

## Capabilities

### New Capabilities
- `generic-transcript-subscriber-api`: stable extension contract for finalized source-tagged transcript events.

## Impact

Refines the event module from change 001. Potential upstream contribution: yes.

## Product-Level Merge Gate

A standalone consumer can register for finalized events using only generic Hearsay concepts, and consumer failure/overload remains isolated from transcription.
