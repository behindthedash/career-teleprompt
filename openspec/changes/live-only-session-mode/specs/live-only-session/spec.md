## MODIFIED Requirements

### Requirement: Persisted output remains the normal default
When no live-only policy is selected, existing saved-transcript behavior SHALL remain the default.

#### Scenario: Existing start-recording action is used
- **WHEN** no live-only policy is explicitly selected
- **THEN** transcript persistence behaves as before

### Requirement: Live-only does not mean delete-after-write
Hearsay SHALL avoid creating the transcript artifact in live-only mode rather than writing sensitive text and deleting it afterward. The runtime SHALL decide transcript persistence before writer construction.

#### Scenario: Live-only session starts
- **WHEN** a session is created with live-only output
- **THEN** Hearsay does not create a markdown transcript writer/file while live view and transcript events remain available
