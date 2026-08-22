## Purpose

Defines a reusable, failure-isolated API for consuming finalized Hearsay transcript events.

## ADDED Requirements

### Requirement: Subscribers use a generic finalized-transcript contract
#### Scenario: Non-interview extension registers
- **WHEN** an extension registers for transcript events
- **THEN** it can consume session/source/text/timing/order data without importing interview-specific modules

### Requirement: Subscriber health is observable without transcript retention
#### Scenario: Subscriber drops or fails events
- **WHEN** its queue overflows or handler raises
- **THEN** the dispatcher exposes diagnostic counts/status without storing the transcript body as diagnostic history

### Requirement: Core delivery cannot be made blocking by an extension
#### Scenario: Subscriber requests work slower than transcription
- **WHEN** its bounded queue fills
- **THEN** the configured non-blocking overflow policy applies and core transcript processing continues

### Requirement: API behavior is documented and tested independently
#### Scenario: Copilot extras are not installed
- **WHEN** generic transcript-event tests run in a base Hearsay environment
- **THEN** they pass without importing retrieval/vector/LLM dependencies
