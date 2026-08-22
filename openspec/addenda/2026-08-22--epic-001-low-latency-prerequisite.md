# Epic 001 Addendum — Low-Latency Live Transcription

**Date:** 2026-08-22  
**Applies to:** `001-extension-host-foundation`  
**Status:** Proposed host prerequisite

## Finding

Upstream Hearsay currently uses `CHUNK_DURATION_S = 30`, and the live transcript UI warns of roughly 30–60 seconds of delay. That is acceptable for batch-oriented meeting transcription but too slow for external live consumers that need finalized speech while it is still actionable.

## Host Decision

Keep low-latency transcription as a generic Hearsay capability rather than an interview-specific implementation detail.

OpenSpec change `017-low-latency-live-transcription` introduces a session-scoped live profile while preserving the ordinary 30-second recording profile.

The host must expose enough backlog/throughput diagnostics for a consumer to know when the selected Whisper model/hardware cannot keep up with the requested cadence.

## Dependency Consequence

The external Interview Copilot may request/use the live profile, but it must not configure `AudioRecorder` or `TranscriptionPipeline` internals directly. The supported dependency is the Hearsay session/profile API.

## Acceptance Consequence

Windows profiling must demonstrate materially reduced finalized-text latency for the live profile and prove that ordinary Hearsay's existing recording behavior remains intact.
