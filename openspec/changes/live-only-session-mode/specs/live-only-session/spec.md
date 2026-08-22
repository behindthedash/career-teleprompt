## MODIFIED Requirements

### Requirement: Live-only sessions do not create Hearsay transcript files
The runtime SHALL decide transcript persistence before writer construction.

#### Scenario: Live-only session starts
- **WHEN** a session is created with live-only output
- **THEN** Hearsay does not create a markdown transcript writer/file while live view and transcript events remain available

### Requirement: Persisted output remains default
#### Scenario: Existing start-recording action is used
- **WHEN** no live-only policy is explicitly selected
- **THEN** transcript persistence behaves as before
