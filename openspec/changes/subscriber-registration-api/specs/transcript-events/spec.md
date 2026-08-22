## ADDED Requirements

### Requirement: Consumers can explicitly register transcript handlers
Hearsay SHALL expose a documented registration API for finalized transcript events.

#### Scenario: Consumer registers for Remote speech
- **WHEN** a consumer registers a named handler filtered to Remote events
- **THEN** the handler receives eligible Remote events and does not receive Local events

### Requirement: Subscriber delivery is bounded and failure isolated
Each subscriber SHALL have bounded delivery capacity and SHALL NOT block core transcript processing.

#### Scenario: Subscriber queue fills
- **WHEN** a subscriber cannot keep pace and its queue reaches capacity
- **THEN** the configured non-blocking overflow policy applies, a drop diagnostic is recorded, and transcription continues

### Requirement: Subscriber health is observable without retaining transcript bodies
Diagnostics SHALL expose delivered/dropped/failure counts and last failure timing/status without storing transcript text as diagnostic history.

#### Scenario: Handler raises
- **WHEN** a handler raises while processing an event
- **THEN** its failure counter/status updates and other subscribers/core transcription continue
