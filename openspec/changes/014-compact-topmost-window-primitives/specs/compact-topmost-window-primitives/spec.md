## Purpose

Provides reusable presentation mechanics for compact topmost Hearsay windows without embedding domain behavior.

## ADDED Requirements

### Requirement: Topmost presentation is reusable
#### Scenario: Cue and teleprompter windows are created
- **WHEN** each opts into the compact topmost primitive
- **THEN** both receive the same topmost, opacity, and geometry behavior without duplicating implementation

### Requirement: Content updates do not force focus
#### Scenario: Foreground app is another process
- **WHEN** a topmost projection updates its content
- **THEN** the shared update path does not call a focus-forcing operation

### Requirement: Invalid persisted geometry fails safely
#### Scenario: Monitor layout changed
- **WHEN** stored placement is no longer visible on current displays
- **THEN** the window falls back to a visible default position
