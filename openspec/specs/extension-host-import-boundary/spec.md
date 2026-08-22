## Purpose

Defines a side-effect-free supported Python import boundary for external applications consuming Hearsay transcript/session capabilities.

## Requirements

### Requirement: Public extension contracts import without application startup
Importing documented event/subscription/session contracts SHALL NOT create tray UI, open audio devices, start recording, or load a Whisper model solely because of the import.

### Requirement: Public host imports require only Hearsay core dependencies
The supported import surface SHALL succeed with Hearsay's normal dependency set and SHALL NOT require downstream retrieval, vector, database, or LLM packages.

### Requirement: Downstream dependencies remain outside Hearsay packaging
Standard Hearsay packaging SHALL NOT bundle consumer-specific dependency sets merely because external applications use the host API.

### Requirement: Private internals are outside the supported contract
External integrations SHALL be possible through documented public modules without reading private transcript queues, tkinter widgets, recorder internals, or Whisper pipeline internals.

### Requirement: Import behavior is regression-tested externally
CI SHALL include a subprocess-style smoke test proving the public API imports successfully without application/audio startup side effects.
