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

#### Scenario: Consumer registers for Remote speech
- **WHEN** a consumer registers a named handler filtered to Remote events
- **THEN** the handler receives eligible Remote events and does not receive Local events

### Requirement: Events preserve finalized order within a session
A healthy subscriber SHALL observe events in the same finalized order in which Hearsay drains accepted transcript segments for that session.

#### Scenario: Multiple segments are finalized in sequence
- **WHEN** several transcript segments are drained for one session in finalized order
- **THEN** a healthy subscriber receives the corresponding events in that same order with monotonically increasing ordering information

### Requirement: Recording sessions are isolated
Each event SHALL belong to exactly one session identity, allocated uniquely per recording session. New sessions SHALL not inherit queued events or relabeled data from prior sessions, and delayed prior-session work SHALL NOT be relabeled as current-session events.

#### Scenario: Recording restarts
- **WHEN** one session ends and another begins
- **THEN** the new session has a distinct identity and stale prior-session work cannot enter the new event stream

### Requirement: Subscriber failure cannot block core transcription
Subscriber exceptions, stalls, or overload SHALL NOT stop audio capture, transcription, normal transcript output, or the live transcript view. Delivery SHALL use bounded non-blocking behavior.

#### Scenario: Subscriber queue fills
- **WHEN** a subscriber cannot keep pace and its queue reaches capacity
- **THEN** the configured non-blocking overflow policy applies, a drop diagnostic is recorded, and transcription continues

### Requirement: Subscriber health is observable without transcript retention
Hearsay SHALL expose delivery/drop/failure diagnostics sufficient to troubleshoot a subscriber without retaining transcript bodies as diagnostic history.

#### Scenario: Handler raises
- **WHEN** a handler raises while processing an event
- **THEN** its failure counter/status updates and other subscribers/core transcription continue

### Requirement: Subscription lifecycle is explicit
A subscriber SHALL be unregisterable, and session/application teardown SHALL prevent stale queued delivery from appearing as current-session data.

#### Scenario: Subscriber unregisters
- **WHEN** a consumer unregisters a previously registered handler
- **THEN** that handler receives no further events

#### Scenario: Session ends with queued deliveries pending
- **WHEN** a session or the application tears down while a subscriber still has undelivered queued events
- **THEN** those stale events are not delivered as data belonging to a later session

### Requirement: No subscribers preserves normal behavior
When no subscriber is registered, ordinary Hearsay recording/output SHALL continue without additional user configuration.

#### Scenario: Recording with no registered subscriber
- **WHEN** a recording session starts and no transcript subscriber has been registered
- **THEN** capture, transcription, live display, and transcript output behave exactly as before without any additional configuration
