# Epic 001 Addendum: Low-Latency Transcription Prerequisite

**Date:** 2026-08-22  
**Applies to:** `001-live-interview-copilot`  
**Status:** Proposed prerequisite discovered during OpenSpec feature expansion

## Finding

The upstream application currently uses `CHUNK_DURATION_S = 30`, and `LiveTranscriptWindow` tells users that transcript text may appear with approximately 30–60 seconds of delay. That cadence is appropriate for a meeting transcription utility but is incompatible with the Epic 001 product goal of surfacing cues while an interview question is still actionable.

## Roadmap Change

Add OpenSpec change **`017-low-latency-live-transcription`** as an Epic 001 prerequisite. It does not renumber the already-published 001–016 roadmap. The change introduces a session-scoped live transcription profile while preserving the existing 30-second behavior for ordinary Hearsay recording.

Updated implementation sequence for Epic 001:

1. `001-transcript-event-extension-boundary`
2. `002-ephemeral-copilot-session`
3. `003-local-knowledge-index` (parallel-capable)
4. `017-low-latency-live-transcription`
5. `004-remote-question-boundaries`
6. `005-interview-cue-retrieval`
7. `006-interview-cue-overlay`
8. `007-live-interview-copilot-integration`

Change 017 should be implemented early enough that question-boundary and end-to-end latency measurements are based on the intended live cadence rather than the upstream batch cadence.

## Acceptance Consequence

Epic 001 cannot be considered complete merely because retrieval and the overlay work functionally. The Windows acceptance journey must report measured question-end -> finalized transcript -> query -> first-cue latency under the live profile and must also prove the ordinary 30-second Hearsay path remains intact.
