## Why

Hearsay needs a stable event seam after transcript cleanup so downstream consumers can react to finalized speech without reading internal queues or UI state.

## What Changes

- Introduce immutable finalized transcript events with session/source/order/timing metadata.
- Publish events after existing source labeling, overlap deduplication, and echo suppression.
- Preserve existing markdown/live-view behavior.
- Isolate event-delivery failures from core transcription.

## Capabilities

### Modified Capabilities
- `transcript-events`

## Impact

Adds the first runtime implementation of the canonical transcript-events capability and creates the extension seam required by downstream consumers.
