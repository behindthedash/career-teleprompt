## MODIFIED Requirements

### Requirement: Transcription window cadence is selectable per recording session
The recorder SHALL accept session-scoped chunk duration/overlap parameters while retaining existing defaults for normal sessions.

#### Scenario: Live profile is selected
- **WHEN** a live session starts with the initial low-latency profile
- **THEN** capture windows use the configured shorter cadence rather than the global normal-window constant

### Requirement: Live transcription lag/backpressure is observable
The runtime SHALL record audio duration, transcription elapsed time/realtime factor, and queue/backlog depth sufficient to classify healthy versus behind state.

#### Scenario: Processing falls behind realtime
- **WHEN** backlog or realtime factor exceeds the configured healthy threshold
- **THEN** Hearsay reports degraded live status rather than silently accumulating delay
