## Purpose

Provides a stable, session-scoped stream of finalized speech events that optional Hearsay features can consume without interfering with normal transcription output.

## ADDED Requirements

### Requirement: Finalized speech is exposed as transcript events
The system SHALL expose finalized transcribed speech as events after source labeling, overlap deduplication, and echo suppression have completed. Each event SHALL identify the recording session, source, transcript text, ordering information, and available timing information.

#### Scenario: Remote finalized speech is published
- **WHEN** a finalized remote/system-audio transcript segment is accepted by the transcription pipeline
- **THEN** subscribers receive one finalized transcript event identifying the segment as Remote and carrying its session and ordering metadata

#### Scenario: Local finalized speech is published
- **WHEN** a finalized microphone transcript segment is accepted by the transcription pipeline
- **THEN** subscribers receive one finalized transcript event identifying the segment as Local and carrying its session and ordering metadata

### Requirement: Events preserve source order within a session
Transcript events SHALL be delivered to a healthy subscriber in the same order in which finalized segments are drained for that recording session. The system SHALL NOT reorder a later segment ahead of an earlier segment for the same subscriber.

#### Scenario: Multi-source results remain ordered
- **WHEN** one session produces a sequence of finalized Remote and Local segments
- **THEN** a healthy subscriber observes those events in the same finalized order

### Requirement: Recording sessions are isolated
Every transcript event SHALL be bound to exactly one recording-session identity. Starting a new recording SHALL establish a new identity, and queued or delayed work from a prior session SHALL NOT be delivered as though it belongs to the new session.

#### Scenario: Restarted recording gets a new identity
- **WHEN** a user stops one recording and starts another
- **THEN** events from the second recording carry a different session identity and no event from the first recording is relabeled as part of the second

### Requirement: Subscriber failure does not break core transcription
An exception, stall, or overload in an optional transcript subscriber SHALL NOT stop audio capture, transcription, markdown output, or the existing live transcript. Subscriber overload SHALL be bounded and observable rather than creating unbounded memory growth.

#### Scenario: Subscriber raises an exception
- **WHEN** one optional subscriber throws while processing an event
- **THEN** the failure is recorded for diagnosis, that subscriber is isolated, and ordinary Hearsay transcription/output continues

#### Scenario: Subscriber cannot keep up
- **WHEN** a subscriber consumes events slower than they are produced until its bounded capacity is exhausted
- **THEN** the system records the overflow condition and protects the core transcription path from blocking or unbounded queue growth

### Requirement: Subscription is optional and additive
Hearsay SHALL retain its existing normal transcription behavior when no optional transcript subscriber is registered.

#### Scenario: No extensions are configured
- **WHEN** the user records a normal Hearsay session with no transcript subscribers
- **THEN** the existing transcript file and live-view behavior continue without requiring the event feature to be configured by the user
