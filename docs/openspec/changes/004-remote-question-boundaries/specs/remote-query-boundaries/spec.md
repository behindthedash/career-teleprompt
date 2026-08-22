## Purpose

Turns finalized remote speech into bounded, coherent query candidates suitable for semantic retrieval without continuously searching on every transcript fragment.

## ADDED Requirements

### Requirement: Automatic query assembly uses remote speech only
The system SHALL use Remote transcript events for automatic interviewer-query assembly and SHALL NOT automatically treat Local microphone speech as interviewer intent.

#### Scenario: Interviewer speaks then candidate answers
- **WHEN** Remote speech is followed by Local speech
- **THEN** the Remote speech may produce an interviewer query and the Local speech does not create an automatic interviewer query

### Requirement: Adjacent remote segments are assembled into coherent utterances
The system SHALL maintain a bounded in-memory buffer that can combine adjacent finalized Remote segments belonging to the same interviewer turn before emitting a query candidate.

#### Scenario: Question spans multiple transcript segments
- **WHEN** one interviewer question arrives as multiple adjacent finalized Remote segments without a completion boundary between them
- **THEN** the emitted query candidate contains the coherent combined question rather than separate searches for each segment

### Requirement: Query emission is selective and bounded
The system SHALL emit a query candidate when a configured utterance-completion condition is met, including an explicit manual trigger, and SHALL impose maximum age/size bounds so an unfinished utterance cannot grow indefinitely.

#### Scenario: Remote question reaches a completion boundary
- **WHEN** accumulated Remote speech reaches a recognized completion boundary
- **THEN** one query candidate is emitted for the accumulated utterance and the active buffer advances for subsequent speech

#### Scenario: Long utterance never presents terminal punctuation
- **WHEN** Remote speech continues beyond the configured maximum utterance age or size
- **THEN** the system emits or closes a bounded candidate according to policy instead of allowing unbounded memory growth

#### Scenario: User requests retrieval manually
- **WHEN** the user explicitly requests retrieval for the current Remote buffer
- **THEN** the current coherent buffered speech is emitted as a query candidate without waiting for an automatic boundary

### Requirement: Duplicate boundaries do not flood retrieval
The system SHALL suppress materially duplicate query candidates created by repeated/overlapping finalized speech or multiple completion signals for the same utterance.

#### Scenario: Same question repeats through overlap artifacts
- **WHEN** finalized transcript input repeats substantially the same already-emitted utterance because of overlap or boundary timing
- **THEN** the system does not emit an additional materially identical query solely because of that repetition

### Requirement: Query candidates carry supersession identity
Every emitted query candidate SHALL identify its session and SHALL carry a monotonically advancing generation/order value that downstream work can use to determine whether a result is stale.

#### Scenario: Interviewer moves to a new question
- **WHEN** a second query candidate is emitted after an earlier candidate in the same session
- **THEN** the second candidate has a newer generation so downstream retrieval can prevent the older result from replacing newer cues

### Requirement: Session teardown clears utterance state
Stopping or replacing a recording session SHALL clear buffered Remote speech and query-generation state for that session.

#### Scenario: New interview session begins
- **WHEN** a prior session with buffered Remote speech ends and another session starts
- **THEN** the new session begins with an empty utterance buffer and does not emit a query containing speech from the prior session
