## Why

The current 30-second capture window is too slow for live downstream consumers. Hearsay needs a generic shorter session profile while preserving normal recording behavior.

## What Changes

- Parameterize recorder chunk duration and overlap per session.
- Add a live profile beginning with 4s/1s as a profiling baseline.
- Preserve final partial flush and overlap deduplication.
- Measure processing elapsed time, realtime factor, and queue depth.
- Surface healthy/behind state without automatic model switching.

## Capabilities

### Modified Capabilities
- `low-latency-transcription`
