## Purpose

Defines the prepared and generated teleprompter documents that the overlay displays and speech following reads: ordered sections carrying separate display text and normalized match text, tracked provenance, and generated content that stays ephemeral unless explicitly saved.

## ADDED Requirements

### Requirement: Documents are ordered sections with display and match text
A teleprompter document SHALL consist of one or more ordered sections. Each section SHALL carry the text shown to the user unchanged and a separately normalized match text (case-folded, punctuation removed, whitespace collapsed) used for speech alignment. Normalization SHALL NOT alter what the user sees.

#### Scenario: Display and match text diverge without changing display
- **WHEN** a section contains punctuation, mixed case, or repeated whitespace
- **THEN** its display text keeps the authored form while its match text is lower-case, punctuation-free, and single-spaced

#### Scenario: Empty content is rejected
- **WHEN** a document is loaded from text that contains no readable content
- **THEN** loading fails with an explicit error instead of producing an empty document

### Requirement: Prepared documents load from plain text and Markdown
The user SHALL be able to load a prepared document from plain text or Markdown, typed in the app or imported from a `.txt` or `.md` file. Markdown SHALL be split into stable, ordered sections at headings, with each heading retained as the section title; plain text SHALL load as a single section.

#### Scenario: Markdown splits at headings
- **WHEN** a Markdown document with three headings is loaded
- **THEN** the document has three sections in source order, each titled by its heading

#### Scenario: Plain text loads as one section
- **WHEN** a plain-text document is loaded
- **THEN** the document has exactly one section containing the cleaned text

#### Scenario: File format inferred from extension
- **WHEN** a file with a `.md` or `.markdown` extension is imported
- **THEN** it is parsed as Markdown, and any other extension is parsed as plain text

### Requirement: Origin and provenance are tracked
Every document SHALL declare whether it is `prepared` (user-owned) or `generated` (produced from an AI response) and SHALL carry a source identifier. Generated documents SHALL additionally record the response session, the generation counter of the query that produced them, and any retrieval evidence references available.

#### Scenario: Prepared document records its source
- **WHEN** a prepared document is imported from a file
- **THEN** its provenance identifies that file as the source

#### Scenario: Generated document records its response provenance
- **WHEN** a document is created from an AI response that cited retrieved evidence
- **THEN** the document records the response session, generation counter, and the evidence references

### Requirement: Section identity is stable
Section and document identifiers SHALL be derived deterministically from origin, source, and content so that reloading identical content yields identical identifiers.

#### Scenario: Reload yields same identifiers
- **WHEN** the same source content is loaded twice
- **THEN** both loads produce the same document and section identifiers

### Requirement: Generated documents are ephemeral unless explicitly saved
A generated document SHALL be marked ephemeral and SHALL NOT be persisted automatically. An explicit save action SHALL convert it into a prepared, non-ephemeral document while preserving its provenance.

#### Scenario: Generated content is not persisted
- **WHEN** a generated document is loaded and the session ends without a save action
- **THEN** no copy of the generated text is written to persistent storage

#### Scenario: Explicit save promotes to prepared
- **WHEN** the user saves a generated document as prepared
- **THEN** the resulting document has `prepared` origin, is not ephemeral, keeps its sections, and retains its response provenance

### Requirement: Content-model behavior is regression-tested
The behaviors above SHALL be covered by automated tests that run in continuous integration, ported from the pre-pivot content-model tests so that behavior parity is verifiable.

#### Scenario: Tests run in CI
- **WHEN** the required integration-branch check runs
- **THEN** the content-model tests execute and must pass
