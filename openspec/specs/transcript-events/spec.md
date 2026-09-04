## Purpose

Defines Hearsay's public finalized-transcript event and subscriber contract for downstream consumers.

## Requirements

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

### Requirement: Subscription registration is explicit and consumer-neutral
Hearsay SHALL provide a documented Python registration API for transcript handlers/subscribers. Registration MAY support source filtering and declared bounded queue capacity, but SHALL NOT require interview, RAG, resume, or teleprompter concepts.

### Requirement: Events preserve finalized order within a session
A healthy subscriber SHALL observe events in the same finalized order in which Hearsay drains accepted transcript segments for that session.

### Requirement: Recording sessions are isolated
Each event SHALL belong to exactly one session identity, allocated uniquely per recording session. New sessions SHALL not inherit queued events or relabeled data from prior sessions, and delayed prior-session work SHALL NOT be relabeled as current-session events.

#### Scenario: Recording restarts
- **WHEN** one session ends and another begins
- **THEN** the new session has a distinct identity and stale prior-session work cannot enter the new event stream

### Requirement: Subscriber failure cannot block core transcription
Subscriber exceptions, stalls, or overload SHALL NOT stop audio capture, transcription, normal transcript output, or the live transcript view. Delivery SHALL use bounded non-blocking behavior.

### Requirement: Subscriber health is observable without transcript retention
Hearsay SHALL expose delivery/drop/failure diagnostics sufficient to troubleshoot a subscriber without retaining transcript bodies as diagnostic history.

### Requirement: Subscription lifecycle is explicit
A subscriber SHALL be unregisterable, and session/application teardown SHALL prevent stale queued delivery from appearing as current-session data.

### Requirement: No subscribers preserves normal behavior
When no subscriber is registered, ordinary Hearsay recording/output SHALL continue without additional user configuration.
