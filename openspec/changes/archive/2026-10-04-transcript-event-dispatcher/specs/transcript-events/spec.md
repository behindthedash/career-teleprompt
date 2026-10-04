## MODIFIED Requirements

### Requirement: Finalized speech is exposed as generic transcript events
Hearsay SHALL expose finalized transcribed speech as immutable transcript events, published only after source labeling, overlap deduplication, and echo suppression have completed. Each event SHALL identify session, source, text, ordering information, finality, and available timing information without downstream-domain metadata.

#### Scenario: Finalized Remote speech is published
- **WHEN** a finalized system-audio segment is accepted by the transcription pipeline
- **THEN** a subscribed consumer receives a `Remote` event with session and ordering metadata

#### Scenario: Finalized Local speech is published
- **WHEN** a finalized microphone segment is accepted
- **THEN** a subscribed consumer receives a `Local` event with session and ordering metadata

#### Scenario: Finalized segment reaches the application drain path
- **WHEN** a cleaned finalized segment is drained for a recording session
- **THEN** exactly one transcript event is created with session identity, source, text, sequence/order data, and available timing metadata

### Requirement: Recording sessions are isolated
Each event SHALL belong to exactly one session identity, allocated uniquely per recording session. New sessions SHALL not inherit queued events or relabeled data from prior sessions, and delayed prior-session work SHALL NOT be relabeled as current-session events.

#### Scenario: Recording restarts
- **WHEN** one session ends and another begins
- **THEN** the new session has a distinct identity and stale prior-session work cannot enter the new event stream
