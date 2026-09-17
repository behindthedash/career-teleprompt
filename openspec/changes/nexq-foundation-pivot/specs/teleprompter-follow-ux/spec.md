## Purpose

Turns follower alignment into a calm reading experience: smooth movement into the reading zone, clear completed/current/upcoming treatment, visible holds on low confidence, manual override with explicit resume, and persisted presentation preferences.

## ADDED Requirements

### Requirement: Current position scrolls smoothly into the reading zone
When the reading position changes, the panel SHALL smoothly scroll so the current phrase sits on the reading line rather than jumping abruptly.

#### Scenario: Position advances
- **WHEN** the follower advances the position by one or more phrases
- **THEN** the panel animates the current phrase onto the reading line

### Requirement: Completed, current, and upcoming text are visually distinct
Text before the position SHALL be de-emphasized, the current phrase SHALL be highlighted, and a limited amount of upcoming text SHALL be emphasized relative to the remainder.

#### Scenario: Three reading states
- **WHEN** a script is being followed
- **THEN** completed text is dimmed, the current phrase is highlighted, and only the nearest upcoming text is emphasized

### Requirement: Low confidence pauses visual movement
While the follower reports uncertain or lost status, the panel SHALL NOT move and SHALL show a holding message telling the user to keep speaking or navigate manually.

#### Scenario: Holding message
- **WHEN** the follower status becomes uncertain or lost
- **THEN** the panel stops scrolling and displays a holding message

### Requirement: Manual override and explicit resume
Manual navigation (section step, keyboard step, click positioning, or editing) SHALL disable automatic following. Following SHALL NOT resume on its own; the user SHALL resume it with an explicit action, after which alignment continues from the manually chosen position.

#### Scenario: Manual navigation suspends following
- **WHEN** the user presses Page Down while following
- **THEN** automatic following is disabled and the position is where the user placed it

#### Scenario: Explicit resume
- **WHEN** the user activates the resume-following action
- **THEN** following re-enables from the current position and the status becomes uncertain until the next confident alignment

### Requirement: Presentation preferences persist
Font size, line spacing, and reading-line position SHALL persist per user across sessions and SHALL be restored on the next launch, falling back to defaults when stored values are missing or invalid.

#### Scenario: Preferences restored
- **WHEN** the user changes font size and restarts the application
- **THEN** the teleprompter opens with the changed font size

#### Scenario: Invalid stored preference
- **WHEN** a stored preference value is out of range or malformed
- **THEN** the default for that preference is used and the others are kept
