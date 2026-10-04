## MODIFIED Requirements

### Requirement: Transcription cadence is selectable per session
Hearsay SHALL support the existing normal cadence and at least one shorter live cadence selected when a session starts. One session's choice SHALL NOT mutate defaults for another session. The recorder SHALL accept session-scoped chunk duration/overlap parameters while retaining existing defaults for normal sessions.

#### Scenario: Live profile is selected
- **WHEN** a live session starts with the initial low-latency profile
- **THEN** capture windows use the configured shorter cadence rather than the global normal-window constant

### Requirement: Live lag/backpressure is observable
Hearsay SHALL measure enough processing/backlog state to determine when finalized windows are produced faster than they are transcribed and SHALL surface sustained lag as degraded state. The runtime SHALL record audio duration, transcription elapsed time/realtime factor, and queue/backlog depth sufficient to classify healthy versus behind state.

#### Scenario: Processing falls behind realtime
- **WHEN** backlog or realtime factor exceeds the configured healthy threshold
- **THEN** Hearsay reports degraded live status rather than silently accumulating delay
