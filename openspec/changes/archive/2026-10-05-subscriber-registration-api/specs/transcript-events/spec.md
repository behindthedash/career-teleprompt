## MODIFIED Requirements

### Requirement: Subscription registration is explicit and consumer-neutral
Hearsay SHALL provide a documented Python registration API for transcript handlers/subscribers. Registration MAY support source filtering and declared bounded queue capacity, but SHALL NOT require interview, RAG, resume, or teleprompter concepts.

#### Scenario: Consumer registers for Remote speech
- **WHEN** a consumer registers a named handler filtered to Remote events
- **THEN** the handler receives eligible Remote events and does not receive Local events

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
