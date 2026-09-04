## Purpose

Defines a side-effect-free supported Python import boundary for external applications consuming Hearsay transcript/session capabilities.

## Requirements

### Requirement: Public extension contracts import without application startup
The documented host package surface SHALL be importable without creating UI, opening audio devices, starting threads, or loading Whisper solely as an import side effect.

#### Scenario: Interview Copilot process imports host contracts
- **WHEN** the downstream process imports only the documented public Hearsay extension modules
- **THEN** the import succeeds with no application/audio/model startup side effects

### Requirement: Public host imports require only Hearsay core dependencies
The supported import surface SHALL succeed with Hearsay's normal dependency set and SHALL NOT require downstream retrieval, vector, database, or LLM packages.

### Requirement: Downstream dependencies remain outside Hearsay packaging
Standard Hearsay packaging SHALL NOT bundle consumer-specific dependency sets merely because external applications use the host API.

### Requirement: Private internals are outside the supported contract
External integrations SHALL be possible through documented public modules without reading private transcript queues, tkinter widgets, recorder internals, or Whisper pipeline internals.

#### Scenario: Consumer subscribes correctly
- **WHEN** a consumer follows integration documentation
- **THEN** it can register handlers and use supported session configuration without importing private queues, tkinter widgets, recorder internals, or Whisper pipeline internals

### Requirement: Import behavior is regression-tested externally
CI SHALL include a subprocess-style smoke test proving the public API imports successfully without application/audio startup side effects.
