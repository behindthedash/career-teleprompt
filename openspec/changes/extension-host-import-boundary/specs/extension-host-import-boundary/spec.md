## MODIFIED Requirements

### Requirement: Public extension contracts import without application startup
The documented host package surface SHALL be importable without creating UI, opening audio devices, starting threads, or loading Whisper solely as an import side effect.

#### Scenario: Interview Copilot process imports host contracts
- **WHEN** the downstream process imports only the documented public Hearsay extension modules
- **THEN** the import succeeds with no application/audio/model startup side effects

### Requirement: Private application internals are not part of the supported contract
#### Scenario: Consumer subscribes correctly
- **WHEN** a consumer follows integration documentation
- **THEN** it can register handlers and use supported session configuration without importing private queues, tkinter widgets, recorder internals, or Whisper pipeline internals
