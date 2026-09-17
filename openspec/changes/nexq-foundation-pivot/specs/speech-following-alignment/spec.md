## Purpose

Advances the teleprompter reading position from the user's live `You` transcript using fuzzy, monotonic alignment that tolerates filler, omissions, repetition, paraphrase, and STT corrections, holding rather than jumping when confidence is low.

## ADDED Requirements

### Requirement: Follower consumes transcript state, not audio
The follower SHALL derive its input from the application's corrected `You` transcript state, including partial and finalized updates. It SHALL NOT read raw audio and SHALL NOT depend on the capture or STT implementation.

#### Scenario: Corrected transcript replaces interim text
- **WHEN** an interim `You` segment is replaced by its corrected final text
- **THEN** the follower aligns against the corrected text and the interim text no longer influences position

#### Scenario: Other speakers are ignored
- **WHEN** `Them` transcript segments arrive
- **THEN** the reading position does not change

### Requirement: Transcript tokens use the document's normalization
Spoken transcript text SHALL be tokenized with the same normalization used to produce document match text, so equal words compare equal.

#### Scenario: Case and punctuation do not matter
- **WHEN** the transcript contains "Data-Platforms," and the script contains "data platforms"
- **THEN** the tokens match

### Requirement: Alignment searches a moving window and scores fuzzily
Alignment SHALL search candidate positions in a window around the last known position, score candidates by ordered token overlap and fuzzy phrase similarity, and boost candidates that match a distinctive run of words that occurs once in the script.

#### Scenario: Distinctive phrase is boosted
- **WHEN** the user speaks a four-word phrase that appears exactly once in the script
- **THEN** that location receives a stronger score than a partial match elsewhere

#### Scenario: Repeated phrase is not boosted
- **WHEN** the user speaks a phrase that appears in multiple script locations
- **THEN** no anchor boost is applied and the nearest forward candidate is preferred

### Requirement: Progress is monotonic by default
The reading position SHALL NOT move backward as a result of automatic alignment. Repeated phrases, restarted sentences, and STT corrections SHALL either advance the position or hold it.

#### Scenario: Repeating an earlier phrase
- **WHEN** the user repeats a phrase already read
- **THEN** the position stays at or beyond its current value

#### Scenario: Restarted sentence
- **WHEN** the user stops mid-sentence and restarts it from the beginning
- **THEN** the position does not move backward and resumes advancing once the sentence continues

#### Scenario: STT correction churn
- **WHEN** a partial transcript is replaced by a final that differs in a few words
- **THEN** the position does not move backward

### Requirement: Low confidence holds instead of jumping
When no candidate meets the confidence threshold, the follower SHALL hold the current position and report an uncertain or lost status rather than move.

#### Scenario: Unrelated aside
- **WHEN** the user says something not in the script
- **THEN** the position is unchanged and the status is reported as uncertain or lost

### Requirement: Intentional forward jumps recover
A strong match well beyond the local window, supported by enough spoken evidence, SHALL be treated as an intentional jump and the position SHALL move forward to it.

#### Scenario: Skipping ahead
- **WHEN** the user skips several sentences and reads a later distinctive passage
- **THEN** the position advances substantially to that passage and the status returns to following

### Requirement: Tolerates filler, omission, and minor paraphrase
Filler words, skipped words, and minor paraphrase SHALL NOT stop forward progress while the spoken sequence still follows the script.

#### Scenario: Filler words
- **WHEN** the user inserts filler words while otherwise reading the script
- **THEN** the position continues to advance

#### Scenario: Skipped words
- **WHEN** the user omits a few words from a sentence
- **THEN** the position still advances through that sentence

#### Scenario: Minor paraphrase
- **WHEN** the user substitutes a synonym or reorders a short phrase
- **THEN** the position still advances through that passage

### Requirement: Confidence and status are exposed
The follower SHALL expose a numeric confidence and a status of `following`, `uncertain`, or `lost` for each alignment result, and SHALL indicate when a result was a recovery jump.

#### Scenario: Status visible to the interface
- **WHEN** an alignment result is applied
- **THEN** the interface can read the resulting status, confidence, and whether a recovery occurred

### Requirement: Alignment corpus is regression-tested
Automated tests SHALL cover: exact reading, skipped word or phrase, filler words, synonym or minor paraphrase, restarted sentence, repeated earlier phrase, unrelated aside, large jump forward, STT partial replaced by corrected final, and a repeated common phrase appearing in multiple script locations.

#### Scenario: Corpus runs in CI
- **WHEN** the required integration-branch check runs
- **THEN** every corpus case executes and must pass
