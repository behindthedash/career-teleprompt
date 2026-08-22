## Purpose

Presents prepared material near the webcam and follows alignment state without taking control away from the user.

## ADDED Requirements

### Requirement: Active prepared content is glanceable
#### Scenario: Alignment moves to a new section
- **WHEN** the alignment engine selects a new active section
- **THEN** the teleprompter places that section in the configured reading position and visually distinguishes it

### Requirement: Updates do not intentionally steal meeting focus
#### Scenario: Zoom is foreground
- **WHEN** alignment updates while Zoom is focused
- **THEN** the teleprompter refreshes without invoking a focus-forcing operation

### Requirement: Manual control always overrides following
#### Scenario: User pauses and jumps
- **WHEN** the user pauses follow mode and selects another section
- **THEN** that section becomes active immediately and automatic alignment does not move it until follow mode resumes

### Requirement: Presentation preferences persist
#### Scenario: Window is reopened
- **WHEN** the user previously changed size, opacity, or font settings
- **THEN** the teleprompter restores those presentation preferences without storing a copy of the prepared script
