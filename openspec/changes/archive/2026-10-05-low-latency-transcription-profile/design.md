## Context

Current constants use a 30-second chunk with 1-second overlap. The recorder cuts windows on wall-clock duration, then the existing transcription pipeline deduplicates overlap.

## Decisions

### D1. Immutable session transcription profile
Define a `TranscriptionProfile` carrying chunk duration, overlap duration, and profile identity. Normal remains 30s/1s. Initial live baseline is 4s/1s and must be profiled rather than treated as guaranteed optimal.

### D2. Keep faster-whisper architecture
No cloud transcription or speculative token streaming in this slice.

### D3. Preserve overlap/final flush
Short windows use the same correctness protections as normal windows.

### D4. Observe rather than auto-switch models
Expose duration, processing elapsed, RTF, queue depth, and health. Do not switch Whisper models mid-session automatically.

## Expected Files
- `src/hearsay/transcription/profile.py`
- recorder parameterization
- pipeline/app metrics
- tests and Windows profiling notes
