## Purpose

Defines prepared speech material as ordered, stable sections suitable for speech-following presentation.

## ADDED Requirements

### Requirement: Prepared content is normalized into ordered sections
The system SHALL load supported text/Markdown content into an ordered collection of sections with stable identity, display text, normalized match text, and source provenance.

#### Scenario: Markdown headings define sections
- **WHEN** a document contains multiple Markdown headings
- **THEN** each heading begins a distinct ordered section whose display text preserves the authored content

#### Scenario: Plain text has no headings
- **WHEN** a supported file contains plain text only
- **THEN** the system exposes one valid section rather than rejecting the file

### Requirement: Unchanged sections keep stable identity
#### Scenario: Document is reloaded without changes
- **WHEN** the same prepared document is loaded again unchanged
- **THEN** its section identifiers remain stable

### Requirement: Invalid or empty content fails clearly
#### Scenario: Empty file is selected
- **WHEN** the selected prepared-content file contains no usable text
- **THEN** the system reports that no teleprompter content is available and does not start speech-following mode
