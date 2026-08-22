## Purpose

Allows a user to run live transcription and optional local extensions without persisting the resulting transcript after the session.

## ADDED Requirements

### Requirement: A recording session has an explicit transcript-output policy
The system SHALL establish the transcript-output policy when a recording session starts. Supported behavior SHALL include the existing persisted-transcript mode and a live-only mode that does not persist transcript text.

#### Scenario: Ordinary recording keeps current behavior
- **WHEN** a user starts a normal Hearsay recording without selecting live-only behavior
- **THEN** the session uses persisted-transcript output and produces the same saved transcript behavior as before this feature

#### Scenario: Live-only behavior is selected
- **WHEN** a recording starts with live-only output selected
- **THEN** the session is marked live-only for its entire lifetime and teardown uses that same policy

### Requirement: Live-only sessions provide live transcription without a saved transcript
A live-only session SHALL continue to capture and transcribe the selected audio sources and SHALL make finalized speech available to the live transcript and transcript-event subscribers, while SHALL NOT create or finalize a transcript document for that session.

#### Scenario: Live-only meeting produces speech
- **WHEN** speech is captured and transcribed during a live-only session
- **THEN** the user can see live transcript updates and subscribers can receive finalized transcript events, but no transcript document is created for the session

### Requirement: Live-only privacy survives every normal termination path
Stopping a live-only session, quitting the application during it, or handling a recorder failure SHALL NOT cause transcript text from that session to be persisted as a fallback or recovery artifact.

#### Scenario: User stops normally
- **WHEN** the user stops a live-only session
- **THEN** transient transcript/session state is cleared and no transcript document for that session exists

#### Scenario: Application exits during a live-only session
- **WHEN** the application is closed while a live-only session is active
- **THEN** teardown completes without creating a transcript document from the transient speech

#### Scenario: Recorder fails
- **WHEN** an unrecoverable recorder failure stops a live-only session
- **THEN** the failure is reported through existing Hearsay behavior and no transcript document is created as part of failure handling

### Requirement: Live-only mode does not change raw-audio persistence
The system SHALL continue Hearsay's existing behavior of not persisting captured raw audio in either persisted-transcript or live-only sessions.

#### Scenario: Live-only session completes
- **WHEN** a live-only session starts, captures audio, and ends
- **THEN** no raw-audio recording artifact is written by Hearsay
