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

#### Scenario: Speech spans a live-profile window boundary
- **WHEN** a live session uses the shorter cadence and a phrase crosses two adjacent capture windows
- **THEN** the boundary overlap and dedup protection prevent the phrase from being dropped or duplicated in the finalized output

#### Scenario: Live session stops mid-window
- **WHEN** a live session stops before the current shorter window has filled
- **THEN** the eligible final partial speech is flushed to transcription rather than discarded

### Requirement: Live lag/backpressure is observable
Hearsay SHALL measure enough processing/backlog state to determine when finalized windows are produced faster than they are transcribed and SHALL surface sustained lag as degraded state. The runtime SHALL record audio duration, transcription elapsed time/realtime factor, and queue/backlog depth sufficient to classify healthy versus behind state.

#### Scenario: Processing falls behind realtime
- **WHEN** backlog or realtime factor exceeds the configured healthy threshold
- **THEN** Hearsay reports degraded live status rather than silently accumulating delay

### Requirement: Healthy live load does not silently drop eligible windows
While operating within supported queue/backlog capacity, eligible audio windows SHALL reach transcription in order without being dropped by the live profile.

#### Scenario: GPU profile runs within capacity
- **WHEN** a live session runs on a configuration that stays healthy for its full duration (reference: `turbo/cuda/float16` on an RTX 4060 Laptop GPU, aggregate realtime factor 0.24x, 100% healthy over 3.65 minutes)
- **THEN** every eligible audio window reaches transcription in capture order and none is dropped by the live profile

#### Scenario: CPU profile runs near capacity
- **WHEN** a live session runs on a configuration whose aggregate realtime factor approaches 1.0x while backlog stays within supported capacity (reference: `small.en/cpu/int8`, aggregate realtime factor 0.92x, Marginal, over 3.41 minutes)
- **THEN** eligible windows are still transcribed in order without drops, and any lag is reported through the live status rather than by discarding windows

### Requirement: Status messaging reflects the active profile
User-facing delay/health messaging SHALL distinguish normal and live cadence rather than always stating the normal 30–60 second expectation.

#### Scenario: Live profile is active
- **WHEN** a session is running with a shorter live cadence
- **THEN** delay/health messaging describes the live cadence expectation instead of the normal 30–60 second expectation

#### Scenario: Normal profile is active
- **WHEN** a session is running with the normal cadence
- **THEN** delay/health messaging retains the normal 30–60 second expectation
