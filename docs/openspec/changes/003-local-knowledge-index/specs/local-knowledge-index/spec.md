## Purpose

Provides a local semantic index over a user-owned resume/project corpus so interview questions can retrieve truthful, provenance-preserving evidence without requiring a cloud service.

## ADDED Requirements

### Requirement: The user can index a local curated knowledge corpus
The system SHALL accept a user-selected local corpus containing supported text documents and SHALL build a semantic index without requiring those source documents to live inside the application repository.

#### Scenario: Corpus outside the repository is indexed
- **WHEN** the user selects a valid local corpus containing supported documents
- **THEN** the system indexes its eligible content and records source provenance for every resulting knowledge chunk

### Requirement: Knowledge chunks preserve claim status and provenance
Every indexed knowledge chunk SHALL identify its source document and SHALL carry an experience status sufficient to distinguish implemented work, prototype/experiment work, design/architecture knowledge, and hypothetical/planned material. Missing required claim-status metadata SHALL be surfaced rather than silently defaulted to implemented.

#### Scenario: Implemented project is indexed
- **WHEN** a source is explicitly marked as implemented work
- **THEN** every chunk derived from that source is retrievable with implemented status and source provenance

#### Scenario: Hypothetical material is indexed
- **WHEN** a source is marked hypothetical or planned
- **THEN** retrieved chunks retain that status and cannot be mistaken for implemented experience by downstream consumers

#### Scenario: Required status is missing
- **WHEN** an otherwise eligible source lacks the required experience-status metadata
- **THEN** indexing reports the source as needing metadata and does not silently classify its claims as implemented

### Requirement: Index refresh is incremental and deterministic
The system SHALL detect unchanged, changed, new, and removed corpus sources. Rebuilding the index with unchanged source content and the same embedding configuration SHALL not create duplicate chunks or unnecessary re-embedding.

#### Scenario: Unchanged corpus is refreshed
- **WHEN** the user refreshes an index and no source content or indexing configuration has changed
- **THEN** existing chunks remain stable and no duplicate knowledge entries are created

#### Scenario: One source changes
- **WHEN** one indexed source changes and the user refreshes the index
- **THEN** chunks derived from that source are replaced or updated while unchanged sources remain intact

#### Scenario: Source is removed
- **WHEN** a previously indexed source no longer exists in the curated corpus
- **THEN** its chunks are removed from the active index on refresh

### Requirement: Semantic retrieval returns ranked evidence with metadata
The system SHALL accept a coherent text query and return a bounded ranked set of relevant knowledge chunks including source provenance and experience status.

#### Scenario: Representative interview question is searched
- **WHEN** a user queries the index with an interview question represented in the evaluation corpus
- **THEN** the response returns a bounded top-k set of semantically relevant chunks with their source and claim-status metadata

### Requirement: Local mode does not require a network request at query time
After required models and dependencies have been installed/cached, local indexing and retrieval SHALL operate without sending corpus text, embeddings, or queries to a remote service.

#### Scenario: Network is unavailable after model setup
- **WHEN** the embedding model is already cached and the machine has no network access
- **THEN** the user can refresh unchanged/local content and execute semantic retrieval from the local index
