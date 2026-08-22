## Purpose

Allows live/cue-oriented sessions to receive finalized speech more frequently than ordinary Hearsay batch transcription while preserving the existing normal recording profile and making real-time lag visible.

## ADDED Requirements

### Requirement: Transcription window cadence is selectable per recording session
The system SHALL support at least the existing normal transcription cadence and a shorter live cadence selected when the recording session starts. Changing one session's cadence SHALL NOT mutate the defaults of another concurrent/subsequent session.

#### Scenario: Normal recording uses existing cadence
- **WHEN** the user starts a standard Hearsay recording without a live profile
- **THEN** audio is windowed using the existing normal cadence and transcript behavior remains compatible with prior releases

#### Scenario: Interview Copilot uses live cadence
- **WHEN** a session starts with the live transcription profile
- **THEN** non-silent audio windows are finalized for transcription at the configured shorter cadence rather than waiting for the normal 30-second window

### Requirement: Shorter windows preserve overlap and final-flush correctness
The live profile SHALL retain protection against words split at window boundaries and SHALL flush eligible final partial speech when the user stops the session.

#### Scenario: Word crosses a live-window boundary
- **WHEN** speech spans two adjacent short windows
- **THEN** overlap/dedup behavior prevents the boundary from producing a persistent duplicated phrase in finalized transcript output

#### Scenario: User stops before next scheduled live cut
- **WHEN** non-silent speech exists in the current partial window and the session stops
- **THEN** eligible final speech is flushed for transcription rather than discarded solely because the live interval has not elapsed

### Requirement: Live transcription lag/backpressure is observable
The system SHALL measure enough processing/backlog state to determine when finalized audio is being produced faster than it is transcribed. Sustained lag SHALL be surfaced as degraded live-transcription state rather than remaining invisible while cue latency grows.

#### Scenario: Selected model falls behind
- **WHEN** live audio windows accumulate faster than transcription can consume them beyond the configured healthy threshold
- **THEN** the application reports degraded/behind state with actionable context while preserving bounded process memory

#### Scenario: Pipeline catches up
- **WHEN** the backlog returns within the configured healthy threshold
- **THEN** the live-transcription health state returns to healthy without restarting the session

### Requirement: Live profile does not silently drop core audio under healthy load
When the live transcription pipeline is operating within its supported queue/backlog bounds, the system SHALL process each eligible audio window in order.

#### Scenario: Live pipeline keeps pace
- **WHEN** the selected model/hardware consumes windows within the configured healthy capacity
- **THEN** eligible windows reach transcription in order and no window is dropped by the live profile

### Requirement: Delay messaging reflects active profile
Any user-facing delay/status messaging SHALL reflect whether the active session uses normal or live cadence and SHALL NOT state a fixed 30–60 second delay for a healthy low-latency session.

#### Scenario: Live session opens transcript/cue status
- **WHEN** a live-profile session is active
- **THEN** the UI reports live-profile processing/health rather than the static normal-mode delay disclaimer
