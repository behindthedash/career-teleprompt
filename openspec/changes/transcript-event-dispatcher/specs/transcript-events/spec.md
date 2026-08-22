## MODIFIED Requirements

### Requirement: Finalized speech is exposed as transcript events
The implementation SHALL publish immutable transcript events only after Hearsay has completed source labeling, overlap deduplication, and echo suppression.

#### Scenario: Finalized segment reaches the application drain path
- **WHEN** a cleaned finalized segment is drained for a recording session
- **THEN** exactly one transcript event is created with session identity, source, text, sequence/order data, and available timing metadata

### Requirement: Recording sessions are isolated
The dispatcher SHALL allocate a unique session identity per recording session and SHALL NOT relabel delayed prior-session events as current-session events.

#### Scenario: Recording restarts
- **WHEN** one session ends and another begins
- **THEN** the new session has a distinct identity and stale prior-session work cannot enter the new event stream
