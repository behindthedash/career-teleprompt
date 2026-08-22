## Purpose

Presents current interview guidance in a glanceable near-camera window without pulling focus away from the active meeting application.

## ADDED Requirements

### Requirement: Interview cues are shown in a compact always-on-top view
When enabled, the system SHALL provide a compact cue view that can remain above ordinary application windows and SHALL render the current structured interview cue without reproducing full corpus documents or a long scripted answer.

#### Scenario: Ready cue is displayed
- **WHEN** a current interview cue becomes ready
- **THEN** the overlay shows the question/intent, at most one recommended story, a bounded supporting-point list, and concise provenance/status information

### Requirement: Background cue updates do not steal meeting focus
Updating or refreshing the cue overlay from background transcript/retrieval activity SHALL NOT intentionally activate the cue window or move keyboard focus away from the user's foreground meeting application.

#### Scenario: Zoom remains foreground during cue refresh
- **WHEN** Zoom or another application owns keyboard focus and a new cue arrives
- **THEN** the overlay updates its visible content without taking keyboard focus from that foreground application

### Requirement: The user controls overlay placement and readability
The user SHALL be able to move the overlay and adjust presentation settings including font size and compact-window dimensions; supported settings SHALL persist across application restarts. A saved position that is no longer visible after monitor changes SHALL be recovered onto a visible work area.

#### Scenario: User places overlay beneath webcam
- **WHEN** the user moves/resizes the overlay and later restarts Hearsay with the same display layout
- **THEN** the overlay reopens using the saved usable geometry

#### Scenario: Saved monitor is disconnected
- **WHEN** saved overlay coordinates fall outside all current visible work areas
- **THEN** the overlay opens at a safe visible position instead of remaining off-screen

### Requirement: Claim status remains visible in the cue projection
The overlay SHALL preserve the distinction between implemented/prototype/design evidence and hypothetical/application ideas when rendering cue content.

#### Scenario: Cue includes a hypothetical role bridge
- **WHEN** a cue contains implemented supporting evidence plus a hypothetical role/application bridge
- **THEN** the role bridge is visually distinguishable and is not presented as part of the implemented project story

### Requirement: Overlay state communicates cue availability
The overlay SHALL represent listening/idle, retrieving, ready, no-match, and unavailable states in a concise form so the user can tell whether the absence of bullets means no question has arrived, retrieval is in progress, or retrieval failed.

#### Scenario: Retrieval is still running
- **WHEN** a new query is current and its retrieval has not completed
- **THEN** the overlay shows a retrieving state without displaying an older cue as though it answers the new question

#### Scenario: Retrieval is unavailable
- **WHEN** the cue pipeline reports that local retrieval is unavailable
- **THEN** the overlay reports that state without closing the meeting or transcription session

### Requirement: Overlay visibility is directly controllable
The user SHALL be able to show/hide and clear the cue overlay without stopping audio transcription.

#### Scenario: User hides the overlay mid-session
- **WHEN** the user hides the cue overlay while an interview session is active
- **THEN** transcription/retrieval may continue and the overlay can be shown again with the current state
