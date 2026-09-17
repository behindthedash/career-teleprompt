## Purpose

Adds a dedicated teleprompter layout to the always-on-top overlay with a fixed reading zone, presentation controls, manual navigation, and prepared-document selection, reusing the overlay's existing window behavior.

## ADDED Requirements

### Requirement: Overlay offers a teleprompter layout mode
The overlay SHALL offer a `teleprompt` layout mode alongside its existing modes. Selecting it SHALL show a dedicated full-panel teleprompter view; other layout modes SHALL be unaffected.

#### Scenario: Switching into teleprompter mode
- **WHEN** the user selects the teleprompter mode button
- **THEN** the overlay shows the teleprompter panel in place of the transcript and AI panels

#### Scenario: Other modes unchanged
- **WHEN** the user switches back to a non-teleprompter mode
- **THEN** that mode renders exactly as it did before the teleprompter mode existed

### Requirement: Fixed reading zone
The panel SHALL keep the current reading position at a fixed reading line whose vertical placement is configurable as a percentage of the panel height, defaulting to the upper-middle of the panel.

#### Scenario: Reading line placement
- **WHEN** the user changes the reading-position setting
- **THEN** the reading line moves to that percentage from the top and subsequent scrolling keeps the current text on that line

### Requirement: Presentation controls
The panel SHALL let the user adjust font size within a bounded range and adjust line spacing. Changes SHALL apply immediately to the displayed text.

#### Scenario: Font size bounds
- **WHEN** the user repeatedly increases or decreases font size
- **THEN** the size stops at the configured maximum or minimum and never exceeds it

### Requirement: Manual navigation and keyboard control
The user SHALL be able to move to the previous or next section, position directly on a phrase by clicking it, and step with keyboard shortcuts while the overlay has focus.

#### Scenario: Keyboard stepping
- **WHEN** the user presses Page Up or Page Down in teleprompter mode
- **THEN** the reading position moves to the previous or next section

#### Scenario: Click positioning
- **WHEN** the user clicks a phrase in the script
- **THEN** the reading position moves to that phrase

### Requirement: Existing overlay window behavior is reused
Teleprompter mode SHALL inherit the overlay's opacity, always-on-top, stealth, and window-placement behavior without a separate window implementation.

#### Scenario: Always-on-top persists
- **WHEN** the overlay is in teleprompter mode and another application is focused
- **THEN** the overlay remains visible on top exactly as in other modes

### Requirement: Prepared document selection before or during an interview
The user SHALL be able to enter or import a prepared document before a meeting starts and replace it during a meeting. Editing SHALL pause speech following until the edit is confirmed or cancelled.

#### Scenario: Load during meeting
- **WHEN** a meeting is active and the user imports a new prepared file
- **THEN** the panel shows the new document from its first section and following restarts from the beginning

#### Scenario: Editing pauses following
- **WHEN** the user begins editing the script text
- **THEN** automatic following is disabled until editing ends
