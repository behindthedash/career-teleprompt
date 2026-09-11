## Purpose

Allows live consumers to receive finalized speech more frequently than ordinary batch transcription while preserving Hearsay's normal recording profile and making real-time lag visible.

## Requirements

### Requirement: Transcription cadence is selectable per session
Hearsay SHALL support the existing normal cadence and at least one shorter live cadence selected when a session starts. One session's choice SHALL NOT mutate defaults for another session. The recorder SHALL accept session-scoped chunk duration/overlap parameters while retaining existing defaults for normal sessions.

#### Scenario: Live profile is selected
- **WHEN** a live session starts with the initial low-latency profile
- **THEN** capture windows use the configured shorter cadence rather than the global normal-window constant

### Requirement: Shorter windows preserve overlap and final-flush correctness
A live profile SHALL retain boundary overlap/dedup protection and flush eligible final partial speech when a session stops.

### Requirement: Live lag/backpressure is observable
Hearsay SHALL measure enough processing/backlog state to determine when finalized windows are produced faster than they are transcribed and SHALL surface sustained lag as degraded state. The runtime SHALL record audio duration, transcription elapsed time/realtime factor, and queue/backlog depth sufficient to classify healthy versus behind state.

#### Scenario: Processing falls behind realtime
- **WHEN** backlog or realtime factor exceeds the configured healthy threshold
- **THEN** Hearsay reports degraded live status rather than silently accumulating delay

### Requirement: Healthy live load does not silently drop eligible windows
While operating within supported queue/backlog capacity, eligible audio windows SHALL reach transcription in order without being dropped by the live profile.

### Requirement: Status messaging reflects the active profile
User-facing delay/health messaging SHALL distinguish normal and live cadence rather than always stating the normal 30–60 second expectation.
