# Epic 004: NexQ Career Teleprompt Pivot

## Status
Proposed

## Decision
The repository will pivot from the original Python Hearsay transcription application to a NexQ-based Career Teleprompt product. The existing repository and its history remain the canonical project history; prior Hearsay work is retained for reference but is no longer the architectural foundation.

Target repository identity after the pivot: `behindthedash/career-teleprompt` (rename of the existing `behindthedash/hearsay` repository, not a new repository).

## Why
The project goal is an interview copilot and speech-following teleprompter, not a transcription engine. NexQ already provides the infrastructure we were rebuilding: Windows-native audio capture, independent mic/system transcription, multiple STT providers, RAG, LLM providers, interview scenarios, meeting persistence, and an always-on-top React/Tauri overlay.

Continuing to harden Hearsay would spend project effort on commodity plumbing rather than the differentiated product behavior.

## Foundation
Adopt NexQ (`naxhq/NexQ`) as the application code foundation under its MIT license. Preserve NexQ copyright and MIT attribution in all substantial derived distributions. Preserve the original Hearsay license/history as applicable to retained historical code.

The product SHALL prefer NexQ's existing audio/STT/RAG/LLM/overlay abstractions and SHALL NOT introduce parallel Python implementations unless a demonstrated capability gap requires them.

## Product Boundary
### Adopt from NexQ
- Tauri 2 desktop shell
- Rust audio capture and WASAPI loopback
- dual-party `You`/`Them` transcription model
- STT provider abstraction
- local and cloud STT implementations
- meeting/session persistence
- React/Zustand overlay
- RAG/context document pipeline
- LLM providers and streaming AI responses
- interview scenario and `What to Say` workflow

### Build as Career Teleprompt differentiation
- prepared teleprompter documents
- generated/ephemeral teleprompter documents
- speech-following alignment against the `You` transcript stream
- teleprompter-focused overlay mode and reading-zone UX
- fuzzy monotonic progress tracking and recovery
- `What to Say` / AI response -> teleprompter handoff
- prepared Q&A retrieval and interview-specific grounding improvements where they outperform NexQ defaults

### Retain only as historical/reference implementation
- Hearsay PyAudioWPatch/sounddevice capture
- faster-whisper/CTranslate2 packaging and CUDA diagnostics
- Hearsay model cache repair logic
- Hearsay extension-host/subscriber boundary work
- Python UI shell from `hearsay-interview-copilot`

## Migration Principles
1. Keep one canonical repository.
2. Preserve Git history; do not delete the old repositories or rewrite history.
3. Import/adopt NexQ as an explicit foundation with attribution.
4. Avoid changing NexQ audio/STT infrastructure until hardware testing demonstrates a concrete gap.
5. Port behavior and tests from `hearsay-interview-copilot`, not Python architecture.
6. Every migration step must be independently reviewable and leave a buildable repository once the NexQ foundation lands.

## Delivery Sequence
1. `nexq-foundation-import`
   - replace the active application tree with NexQ
   - retain OpenSpec/project governance
   - preserve required MIT notices and document provenance
   - establish `naxhq/NexQ` as conceptual upstream
2. `teleprompter-content-model`
   - TypeScript/Rust equivalent of prepared/generated teleprompter content semantics
   - TXT/Markdown loading, sections, normalized match text, provenance
3. `teleprompter-overlay-mode`
   - add dedicated teleprompter layout to the NexQ overlay
   - reading zone, font/spacing controls, manual navigation, keyboard controls
4. `speech-following-alignment`
   - subscribe to `You` transcript updates
   - moving-window fuzzy alignment, monotonic progress, confidence/hold/recovery
5. `teleprompter-follow-ux`
   - smooth scrolling, current/upcoming/completed visual treatment, override/resume behavior
6. `ai-response-to-teleprompter`
   - allow `What to Say` and other eligible AI responses to become ephemeral teleprompter documents
7. `interview-cue-retrieval-port`
   - selectively port grounded retrieval/response-policy behaviors from `hearsay-interview-copilot`

## Acceptance Criteria
- A Windows user can start an interview meeting using NexQ's normal mic + system-audio pipeline.
- The overlay can switch to a dedicated teleprompter mode.
- Prepared text can be loaded and manually navigated.
- Live `You` transcript segments advance the prepared text without consuming raw audio directly.
- Minor paraphrase, filler, skipped words, repeated phrases, and STT corrections do not cause severe backward jumping.
- An AI-generated `What to Say` answer can be sent to the teleprompter without persistence unless explicitly saved.
- Existing Hearsay history remains recoverable in Git.

## Non-Goals
- Rebuilding WASAPI capture.
- Rebuilding local Whisper packaging before NexQ's implementation is tested.
- Maintaining two production desktop shells.
- Preserving Python module compatibility for obsolete Hearsay extension APIs.
