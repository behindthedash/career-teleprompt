## Purpose

Retrieves truthful evidence for a coherent interview query and composes a small, provenance-preserving cue that can be absorbed at a glance.

## ADDED Requirements

### Requirement: Interview queries retrieve a bounded relevant evidence set
For each eligible query candidate, the system SHALL search the configured local knowledge index and SHALL return a bounded set of relevant evidence rather than the entire corpus.

#### Scenario: AI architecture question is retrieved
- **WHEN** a coherent interview query matches material in the indexed corpus
- **THEN** the cue pipeline receives a bounded ranked evidence set containing the most relevant matching knowledge chunks

### Requirement: Exact terms can reinforce semantic relevance
The ranking behavior SHALL account for exact high-signal terms such as technology, project, skill, or domain names in addition to semantic similarity when those terms are present in both the query and indexed metadata/content.

#### Scenario: Query names a specific technology
- **WHEN** the interviewer explicitly names a skill or technology represented in the corpus
- **THEN** otherwise-relevant evidence containing that exact term can receive a ranking boost without excluding semantically relevant alternatives

### Requirement: Cues preserve truth status and provenance
Every supporting point in an interview cue SHALL be traceable to retrieved source material and SHALL retain its experience status. Hypothetical/planned material SHALL NOT be labeled or phrased as implemented experience.

#### Scenario: Implemented and hypothetical chunks both match
- **WHEN** retrieval returns both implemented evidence and a hypothetical target-role idea
- **THEN** implemented evidence may be used as the recommended experience story while hypothetical material, if shown, is clearly separated as a role/application bridge

#### Scenario: Only hypothetical material matches strongly
- **WHEN** no implemented/prototype evidence adequately supports the question but hypothetical material matches
- **THEN** the cue explicitly indicates that the material is a proposed/application idea and does not invent an implemented project

### Requirement: Default cues are concise and structured
The default cue SHALL provide the interviewer intent/question, at most one primary recommended story, a small bounded list of supporting points, and provenance/status indicators. The default behavior SHALL NOT produce a long-form scripted answer.

#### Scenario: Normal query has several relevant chunks
- **WHEN** retrieval produces enough supporting evidence
- **THEN** the cue contains one recommended story and no more than five concise supporting points rather than reproducing full source documents

### Requirement: Stale retrieval results do not replace newer cues
The system SHALL associate retrieval work and resulting cues with query session/generation identity. A result that completes after a newer query has superseded it SHALL NOT become the active current cue.

#### Scenario: Slow old query finishes after new query
- **WHEN** query generation 5 begins, generation 6 begins before it finishes, and generation 5 later returns
- **THEN** generation 5's result is discarded or retained only as historical diagnostic data and does not replace the active generation-6 cue

### Requirement: Retrieval failure is non-blocking and visible
A local index error, embedding failure, or empty result SHALL NOT interrupt transcription. The cue pipeline SHALL expose a concise unavailable/no-match state that downstream UI can render.

#### Scenario: Knowledge index is unavailable
- **WHEN** a query is emitted while the local knowledge index cannot be opened
- **THEN** transcription continues and the cue result reports retrieval unavailable instead of crashing the recording session
