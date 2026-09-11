## Purpose

Allows Hearsay to provide live transcription/events without saving a Hearsay transcript artifact.

## Requirements

### Requirement: Live-only output is a generic session policy
A session SHALL be able to select live-only output independently of any downstream consumer. In live-only mode, capture, transcription, live display, and transcript events MAY continue while Hearsay does not create/finalize a transcript file.

### Requirement: Persisted output remains the normal default
When no live-only policy is selected, existing saved-transcript behavior SHALL remain the default.

#### Scenario: Existing start-recording action is used
- **WHEN** no live-only policy is explicitly selected
- **THEN** transcript persistence behaves as before

### Requirement: Output policy is visible and explicit
During an active session Hearsay SHALL make clear whether Hearsay transcript-file persistence is enabled or disabled.

### Requirement: Live-only does not mean delete-after-write
Hearsay SHALL avoid creating the transcript artifact in live-only mode rather than writing sensitive text and deleting it afterward. The runtime SHALL decide transcript persistence before writer construction.

#### Scenario: Live-only session starts
- **WHEN** a session is created with live-only output
- **THEN** Hearsay does not create a markdown transcript writer/file while live view and transcript events remain available

### Requirement: Teardown preserves the selected policy
Stop, failure, and application-quit paths SHALL NOT accidentally persist a live-only session.
