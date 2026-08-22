## Purpose

Defines a side-effect-free supported Python import boundary for downstream applications that consume Hearsay transcript/session capabilities.

## ADDED Requirements

### Requirement: Public extension contracts import without application startup
#### Scenario: External process imports the event API
- **WHEN** a Python process imports the documented Hearsay transcript event/subscription contracts
- **THEN** no tray UI is created, no audio device is opened, no recording starts, and no Whisper model is loaded solely because of that import

### Requirement: Public host imports require only Hearsay core dependencies
#### Scenario: Only Hearsay requirements are installed
- **WHEN** an external consumer imports the supported host API
- **THEN** the import succeeds without FastEmbed, psycopg, pgvector, LLM SDKs, or any other downstream consumer dependency being installed

### Requirement: Consumer dependencies remain outside Hearsay packaging
#### Scenario: Standard Hearsay installer is built
- **WHEN** the normal Hearsay package/installer is produced
- **THEN** downstream interview/RAG/vector/database dependencies are not bundled as Hearsay requirements or a consumer-enabled build flavor

### Requirement: Private application internals are not part of the supported contract
#### Scenario: Consumer integration documentation is followed
- **WHEN** an external application subscribes to transcript events
- **THEN** it can do so using documented public modules without reading private transcript queues, tkinter widgets, or Whisper pipeline internals

### Requirement: Import boundary is regression-tested externally
#### Scenario: Consumer smoke test runs in a subprocess
- **WHEN** CI executes the supported-import smoke test
- **THEN** public contracts import successfully and the test can verify that application/audio startup side effects did not occur
