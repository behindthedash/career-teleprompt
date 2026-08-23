# OpenSpec

This repository is treated as a greenfield OpenSpec baseline. Current host behavior is defined canonically under `openspec/specs/`, with implementation changes tracked under `openspec/changes/`.

## Product boundary

Hearsay is a reusable Windows transcription host.

**Hearsay owns:**
- system/microphone audio capture;
- local faster-whisper transcription;
- finalized source-tagged transcript events;
- subscriber registration and failure isolation;
- live-only/no-save sessions;
- low-latency transcription profiles;
- generic local transcription performance diagnostics;
- a side-effect-free supported Python host import surface.

**Hearsay does not own:**
- interviewer intent detection;
- RAG, embeddings, knowledge stores, PostgreSQL/pgvector;
- interview cue generation or overlays;
- speech-following teleprompter behavior;
- any downstream consumer dependency set.

The first downstream consumer is `behindthedash/hearsay-interview-copilot`, but the host contract must remain useful without that application.

## Roadmap

1. [`001-extension-host-foundation.md`](epics/001-extension-host-foundation.md)
2. [`002-upstream-readiness.md`](epics/002-upstream-readiness.md)
3. [`003-live-performance-diagnostics.md`](epics/003-live-performance-diagnostics.md)

Future implementation changes should introduce `openspec/changes/<change-name>/` when modifying this canonical baseline.
