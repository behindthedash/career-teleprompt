## Context

`HearsayApp._poll_transcripts()` is the stable post-transcription boundary: finalized `TranscriptionResult` values have already passed source handling, overlap deduplication, and echo suppression before they are written/rendered.

## Decisions

### D1. Publish from the application drain boundary
Create a frozen `TranscriptEvent` from each finalized result while the app drains the transcript queue. Do not publish from recorder or Whisper internals.

### D2. Session identity is explicit
Create a UUID-like session identifier when recording starts. Sequence numbers are monotonic within that session.

### D3. Existing built-in output remains direct
Markdown writing and live transcript rendering remain on their current direct paths for this slice; the new event stream is additive.

### D4. Event objects are immutable
Representative fields: `session_id`, `sequence`, `chunk_index`, `source`, `text`, `start_time`, `end_time`, `final=True`.

## Expected Files

- `src/hearsay/events/models.py`
- `src/hearsay/events/dispatcher.py`
- `src/hearsay/app.py`
- focused tests using synthetic finalized transcript results
