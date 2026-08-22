## Purpose

Provides one supported local interview-copilot session that composes Hearsay transcription, coherent remote-question detection, local retrieval, and a glanceable cue overlay while preserving ordinary Hearsay recording behavior.

## ADDED Requirements

### Requirement: The user can start an explicit Interview Copilot session
The application SHALL expose Interview Copilot as a distinct start action from ordinary recording and SHALL clearly indicate when the copilot is actively listening/processing.

#### Scenario: User starts Interview Copilot
- **WHEN** the user chooses the Interview Copilot start action
- **THEN** the application performs copilot preflight and, if successful, starts a session with active-listening state distinct from a normal recording

### Requirement: Copilot preflight fails before active listening when required resources are unavailable
Before starting active listening, the system SHALL verify required local resources including a usable remote/system audio path, configured/readable knowledge index, and required local models. A preflight failure SHALL explain the blocking item and SHALL NOT start a partially configured interview session that appears ready.

#### Scenario: Knowledge corpus/index is unavailable
- **WHEN** the user starts Interview Copilot but the configured knowledge index cannot be opened or built
- **THEN** the session does not enter ready/listening state and the user receives a specific remediation message

### Requirement: Remote interviewer speech drives local cue retrieval
During a healthy Interview Copilot session, finalized Remote speech SHALL flow through coherent query assembly and local retrieval, and the current non-stale result SHALL update the cue overlay. Local microphone speech SHALL NOT automatically launch interviewer retrieval.

#### Scenario: Interviewer asks a supported question
- **WHEN** Remote speech forms a coherent query with relevant indexed evidence
- **THEN** the system retrieves that evidence locally and displays a current cue with provenance/status

#### Scenario: Candidate answers
- **WHEN** Local microphone speech arrives while the candidate answers
- **THEN** it does not automatically replace the interviewer query or launch a new remote-question retrieval

### Requirement: New interviewer intent supersedes stale cue work
The integrated session SHALL prevent an older query/retrieval completion from replacing the cue for a newer interviewer query.

#### Scenario: Interviewer asks a second question quickly
- **WHEN** a newer query is emitted before retrieval for the prior query completes
- **THEN** the older result cannot become the active cue after the newer query is current

### Requirement: Copilot defaults to transcript-ephemeral behavior
Interview Copilot SHALL default to live-only/no-saved-transcript output. Persisting an interview transcript SHALL require an explicit user preference/action and SHALL be clearly distinguishable from the default.

#### Scenario: Default copilot session ends
- **WHEN** the user runs Interview Copilot with default output settings and stops the session
- **THEN** no interview transcript document is persisted and transient query/cue buffers are cleared

### Requirement: Optional-stage failure does not terminate core transcription
A knowledge-index, retrieval, or cue-overlay failure SHALL be surfaced as degraded/unavailable copilot state and SHALL NOT by itself stop otherwise healthy Hearsay audio capture/transcription.

#### Scenario: Retrieval worker fails mid-interview
- **WHEN** audio/transcription remain healthy but retrieval becomes unavailable
- **THEN** the user is told cues are unavailable while transcription continues until the user stops or a core recorder/transcription failure occurs

### Requirement: Manual query refresh is available
The user SHALL have an explicit action to request retrieval for the currently buffered Remote interviewer speech without waiting for an automatic boundary.

#### Scenario: Automatic boundary misses a prompt
- **WHEN** Remote speech is buffered but has not emitted an automatic query and the user requests retrieval
- **THEN** the current coherent Remote buffer is emitted/retrieved as the newest query

### Requirement: Ordinary Hearsay recording remains available and unchanged by default
The existing normal `Start Recording` paths SHALL continue to support system audio, microphone, and Both modes with persisted transcript behavior independent of Interview Copilot configuration.

#### Scenario: User starts a normal recording after using copilot
- **WHEN** an Interview Copilot session has ended and the user starts a standard recording
- **THEN** no stale copilot query/cue state appears and the normal recording saves its transcript according to existing behavior
