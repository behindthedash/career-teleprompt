# Change: NexQ Foundation Pivot

## Summary
Replace the active Hearsay application foundation with NexQ while preserving this repository's history and OpenSpec governance. The repository remains canonical and is intended to be renamed to `career-teleprompt` after the migration branch is accepted.

## Problem
The current Python Hearsay foundation requires project-owned solutions for Windows audio reliability, device compatibility, low-latency STT, GPU/runtime packaging, model distribution, extension boundaries, and overlay integration. Those are infrastructure concerns, not the project's differentiating interview-teleprompter behavior.

NexQ already provides a Tauri/Rust/React application with Windows WASAPI loopback, mic/system dual-party transcription, provider-based STT, RAG, LLMs, interview scenarios, meeting persistence, and an always-on-top overlay.

## Proposed Change
Adopt NexQ's application tree as the runtime foundation. Preserve the repository's Git history and OpenSpec artifacts, keep NexQ's MIT attribution, and retire the old Hearsay runtime from active development.

After foundation adoption, implement the Career Teleprompt differentiators directly in the NexQ architecture:

1. teleprompter document model
2. teleprompter overlay mode
3. speech-following fuzzy alignment using the existing `You` transcript stream
4. follow UX and recovery
5. AI response -> teleprompter handoff
6. selective port of grounded interview cue/retrieval behavior

## Architectural Constraints
- No second production Python desktop shell.
- No duplicate RAG/vector store unless a measured gap justifies it.
- No direct raw-audio dependency in the teleprompter follower; it consumes transcript state/events.
- Alignment must be monotonic by default and tolerant of STT corrections, filler, omission, repetition, and minor paraphrase.
- Generated teleprompter content is ephemeral unless explicitly saved.
- NexQ audio/STT code is treated as adopted infrastructure and changed only against a reproducible requirement.

## Repository Strategy
The existing `behindthedash/hearsay` repository remains the canonical history. Do not create a replacement repository. Rename it to `behindthedash/career-teleprompt` after the pivot is approved. GitHub redirects should preserve existing repository links after rename.

The current `behindthedash/hearsay-interview-copilot` repository remains available as a read-only/reference source until all differentiated behavior has been ported.

## Migration Mechanics
The foundation-import implementation should be performed as a single explicit migration commit/PR that:

- starts from the current `dev` history;
- replaces the active app files with the NexQ source tree from a pinned upstream commit;
- retains `openspec/` and migration documentation;
- includes NexQ's LICENSE and provenance notice;
- removes obsolete active runtime files only in the migration commit so they remain recoverable from history;
- records the exact upstream NexQ commit SHA used as the baseline;
- updates build/CI to NexQ's Node/Rust/Tauri toolchain.

Do not squash away pre-pivot Hearsay history.

## Risks
### Upstream drift
NexQ is young and may change quickly. Mitigation: record a pinned baseline and keep upstream-sync work explicit.

### Unknown Windows hardware gaps
NexQ's architecture is stronger but not assumed perfect. Mitigation: run a hardware acceptance matrix before modifying capture code.

### Feature regression during import
The runtime changes completely. Mitigation: treat the foundation import as its own PR and validate NexQ baseline before adding teleprompter behavior.

### Lost useful prior work
Mitigation: keep both repositories/history and port only differentiated behavior with tests.

## Validation
Before teleprompter implementation begins, validate upstream NexQ baseline on Windows with:

- default laptop microphone
- default speakers/system loopback
- Bluetooth output if available
- USB audio if available
- browser/Zoom/Teams-like system audio
- local STT
- one cloud STT provider
- interview scenario
- RAG document load
- overlay behavior

Failures become concrete specs; passing areas are not rewritten.
