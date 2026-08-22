## Purpose

Tracks the user's position in prepared material from finalized Local speech without requiring verbatim delivery.

## ADDED Requirements

### Requirement: Only Local speech drives prepared-content alignment
#### Scenario: Interviewer speaks
- **WHEN** a Remote transcript event arrives
- **THEN** it does not advance or reposition the teleprompter alignment state

### Requirement: Alignment is confidence based
#### Scenario: Strong nearby match
- **WHEN** recent Local speech strongly matches the current or next prepared section
- **THEN** the active section advances to the best supported position with its confidence

#### Scenario: Weak match
- **WHEN** no candidate exceeds the movement threshold
- **THEN** the current position is held

### Requirement: Repetition does not cause runaway advancement
#### Scenario: Speaker restarts a sentence
- **WHEN** Local speech repeats material from the current section
- **THEN** the system remains at that section rather than skipping ahead

### Requirement: Skipped content can recover
#### Scenario: Speaker jumps to a later section
- **WHEN** repeated evidence strongly matches a later section
- **THEN** the engine recovers to that section and marks the move as recovery
