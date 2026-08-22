## Purpose

Allows any Hearsay session to provide live transcription without saving Hearsay transcript output.

## ADDED Requirements

### Requirement: Live-only is available independently of copilot mode
#### Scenario: User starts ordinary live-only transcription
- **WHEN** the user selects live-only output without enabling Interview Copilot
- **THEN** live transcript/event consumers operate and no Hearsay transcript file is created

### Requirement: Persisted output remains default
#### Scenario: User starts normal recording
- **WHEN** no live-only choice is made
- **THEN** the existing saved-transcript workflow remains unchanged

### Requirement: Output mode is visible during the session
#### Scenario: Live-only session is active
- **WHEN** the user views Hearsay session status
- **THEN** the UI clearly indicates that Hearsay transcript-file persistence is disabled
