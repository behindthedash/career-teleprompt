## Why

Transcript events need a supported consumer-facing registration API with explicit lifecycle, bounded backpressure, and diagnostics before external applications depend on it.

## What Changes

- Add explicit handler registration/unregistration.
- Support optional source filtering.
- Deliver through bounded per-subscriber queues/workers.
- Expose non-content diagnostics for delivery, drops, and failures.
- Keep core transcription non-blocking.

## Capabilities

### Modified Capabilities
- `transcript-events`
