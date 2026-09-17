## Purpose

Lets an eligible AI response, including `What to Say` interview guidance, become an ephemeral generated teleprompter document that the follower can track as the user speaks it, without persisting generated content unless the user explicitly saves it.

## ADDED Requirements

### Requirement: Eligible AI responses offer a teleprompter action
Completed, non-empty AI responses SHALL offer a `Prompt` action that loads the response into the teleprompter. Streaming, empty, or errored responses SHALL NOT offer it.

#### Scenario: Action on a completed response
- **WHEN** an AI response finishes streaming with content
- **THEN** the response shows the `Prompt` action

#### Scenario: Action absent while streaming
- **WHEN** a response is still streaming or produced no content
- **THEN** the `Prompt` action is not offered

### Requirement: Handoff produces a generated document and switches modes
Activating the action SHALL convert the response into a generated, ephemeral teleprompter document, load it, and switch the overlay to teleprompter mode. Following SHALL begin from the start of the document as soon as the user starts speaking it.

#### Scenario: Manual handoff
- **WHEN** the user activates `Prompt` on a response
- **THEN** the teleprompter shows that response from its first section in teleprompter mode and following is enabled

### Requirement: Interview guidance enters the teleprompter automatically without interrupting reading
When a `What to Say` interview answer completes, it SHALL load immediately if the teleprompter is empty. If a document is already loaded, the new answer SHALL be staged as pending and activate only once the follower has confidently reached the end of the current document; the user MAY activate or dismiss the pending answer explicitly at any time.

#### Scenario: First answer loads immediately
- **WHEN** an interview answer completes and no document is loaded
- **THEN** the answer becomes the active document and the overlay switches to teleprompter mode

#### Scenario: Later answer waits for completion
- **WHEN** an interview answer completes while the user is still reading the current document
- **THEN** the answer is staged as pending and the current document remains active until the follower confidently reaches its last phrase

#### Scenario: Editing blocks staging
- **WHEN** an interview answer completes while the user is editing the script
- **THEN** the current edit is not replaced

### Requirement: Generated content is not persisted automatically
A document produced by handoff SHALL remain ephemeral. An explicit `Save as Prepared` action SHALL be the only way it is persisted, and it SHALL then become a prepared document.

#### Scenario: Session ends without save
- **WHEN** the meeting ends and the user never saved the generated document
- **THEN** no generated teleprompter text is stored

#### Scenario: Save as Prepared
- **WHEN** the user activates `Save as Prepared` on a generated document
- **THEN** the document becomes prepared and non-ephemeral

### Requirement: Response provenance is preserved
The generated document SHALL record the originating response session and generation counter and SHALL carry any retrieval evidence references the response exposed.

#### Scenario: Evidence carried through
- **WHEN** a response grounded on retrieved documents is handed to the teleprompter
- **THEN** the generated document lists those evidence references
