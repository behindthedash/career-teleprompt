## Why

Change 001 introduces the transcript-event seam to unblock the interview MVP. Epic 003 needs that seam hardened into a small generic API that can be proposed upstream without carrying interview-specific assumptions.

## What Changes

- Document the public event/subscriber contract and lifecycle.
- Add explicit subscriber naming, bounded delivery policy, session reset, and diagnostics.
- Keep the API free of RAG, interview, resume, or teleprompter concepts.
- Add compatibility tests proving ordinary writer/live-view output is unaffected.

## Capabilities

### New Capabilities
- `generic-transcript-subscriber-api`: stable extension contract for finalized source-tagged transcript events.

## Impact

Refines the event module from change 001. Potential upstream contribution: yes.

## Product-Level Merge Gate

A standalone example subscriber can consume finalized events using only generic Hearsay concepts, and failure/overload remains isolated from transcription.
