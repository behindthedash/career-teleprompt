## Purpose

Coordinates two glanceable interview aids without merging their responsibilities.

## ADDED Requirements

### Requirement: Cue and teleprompter state remain independent
#### Scenario: New remote question produces a cue
- **WHEN** a new interview cue is retrieved
- **THEN** the cue projection updates without changing the teleprompter's active prepared section

#### Scenario: Local alignment advances
- **WHEN** the speaker advances through prepared content
- **THEN** the teleprompter updates without replacing or recomputing the current interview cue

### Requirement: Combined presentation avoids focus theft and overlap
#### Scenario: Both windows are visible
- **WHEN** both aids are enabled
- **THEN** their configured layout avoids unintended overlap and neither update path intentionally steals foreground focus

### Requirement: Either aid can run alone
#### Scenario: Teleprompter is disabled
- **WHEN** only dynamic cues are enabled
- **THEN** the cue overlay operates normally without requiring teleprompter state
