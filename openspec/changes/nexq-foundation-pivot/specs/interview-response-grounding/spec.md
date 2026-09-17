## Purpose

Improves interview `What to Say` grounding inside the adopted RAG and prompt pipeline by selectively porting the pre-pivot interview-copilot behaviors that measurably help: evidence ranking, prepared Q&A preference, answer-use history, and strict truthfulness rules.

## ADDED Requirements

### Requirement: Port decisions are evidence-based and recorded
Each pre-pivot interview-copilot behavior (cue retrieval, grounded composition, query boundaries, response policy) SHALL be compared against the adopted foundation's equivalent before any port. Only behavior that materially improves interview response grounding SHALL be ported, and the comparison outcome SHALL be recorded in the repository's port record documentation.

#### Scenario: Behavior compared before porting
- **WHEN** a pre-pivot behavior is considered for porting
- **THEN** a recorded comparison states what the foundation already does, the gap if any, and the port or no-port decision

### Requirement: Interview evidence is ranked for the question
Retrieved context for an interview answer SHALL be re-ranked so that evidence overlapping the detected question and evidence owned by the user outrank generic transcript or unrelated chunks.

#### Scenario: Question-relevant chunk ranks first
- **WHEN** two chunks have similar similarity scores and one overlaps the interviewer's question
- **THEN** the overlapping chunk is ranked higher

### Requirement: Prepared Q&A answers are preferred when they fit
When the user has supplied prepared interview questions and answers, an answer whose question matches the detected question SHALL be preferred as the primary wording. Prepared answers SHALL NOT be forced onto tangential questions and SHALL NOT override grounding rules.

#### Scenario: Matching prepared answer
- **WHEN** the detected question matches a prepared question
- **THEN** the generated guidance uses the prepared answer as its primary wording

#### Scenario: Tangential question
- **WHEN** the detected question is only loosely related to a prepared question
- **THEN** the prepared answer is not imposed and grounded composition applies

### Requirement: Answer-use history reduces repetition
The pipeline SHALL track stories, examples, and claims the user has already used in the meeting and SHALL prefer a materially different supported example for later questions. It SHALL NOT force novelty when the previously used example remains the strongest truthful evidence, and SHALL NOT invent a different project, metric, responsibility, technology, outcome, or implementation.

#### Scenario: Repeated theme
- **WHEN** a later question invites the same example already used
- **THEN** guidance offers an alternative supported example when one exists in the retrieved material

#### Scenario: No alternative exists
- **WHEN** no other truthful example supports the answer
- **THEN** the previously used example is reused rather than fabricated

### Requirement: Guidance never overstates the evidence
Generated interview guidance SHALL distinguish implemented work from proposed, planned, or hypothetical work, SHALL NOT attribute third-party examples to the user, and SHALL acknowledge a gap rather than fabricate a stronger answer when evidence is weak or conflicting.

#### Scenario: Proposed work stays proposed
- **WHEN** the only evidence describes a design or proposal
- **THEN** the guidance presents it as proposed, not as production experience

#### Scenario: Weak evidence
- **WHEN** retrieved evidence is too weak to support the question
- **THEN** the guidance acknowledges the gap instead of inventing detail
