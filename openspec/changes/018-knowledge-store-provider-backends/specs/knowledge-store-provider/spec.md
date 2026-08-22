## Purpose

Defines the storage/retrieval contract used by Hearsay's curated interview knowledge layer, independent of whether that data is stored locally or in an explicitly configured remote provider.

## ADDED Requirements

### Requirement: Hearsay knowledge persistence is provider neutral
The Hearsay indexing and retrieval layer SHALL use a common knowledge-store contract so supported providers expose equivalent document, chunk, provenance, experience-status, retrieval-scope, and query-result semantics.

#### Scenario: Same Hearsay corpus uses either provider
- **WHEN** the same synthetic interview/career corpus is indexed through the local provider and through a configured pgvector provider
- **THEN** both expose equivalent chunk content, provenance, experience status, retrieval scope, and query-result metadata to Hearsay retrieval consumers

### Requirement: Retrieval is explicitly scoped
The store SHALL require an explicit collection or retrieval scope rather than implicitly searching every collection available to the provider.

#### Scenario: Career evidence is requested
- **WHEN** Hearsay queries the `career` collection
- **THEN** target-specific hypothetical interview-preparation chunks are not returned unless that collection was explicitly included in the query

### Requirement: Collection embedding configuration is consistent
A collection SHALL record the embedding model identity and vector dimension used to index it. The store SHALL reject incompatible writes or searches rather than mixing embeddings from different configurations.

#### Scenario: Different embedding configuration is supplied
- **WHEN** a writer or query supplies vectors whose model or dimension does not match the collection
- **THEN** the store refuses the operation and reports that an explicit re-index/rebuild is required

### Requirement: Document re-indexing is atomic
Replacing the chunks for one Hearsay knowledge document SHALL be atomic from the perspective of readers.

#### Scenario: Existing project document changes
- **WHEN** its updated chunks are persisted
- **THEN** retrieval observes either the previous complete chunk generation or the new complete generation, never a partial mixture

### Requirement: Provider failures do not break core Hearsay behavior
A failure in a configured knowledge-store provider SHALL NOT stop audio capture, transcription, ordinary transcript output, or application startup paths that do not require knowledge retrieval.

#### Scenario: Remote knowledge store is unavailable
- **WHEN** the configured pgvector provider cannot be reached during an interview session
- **THEN** knowledge-dependent cues expose an unavailable/degraded state while core Hearsay transcription continues

### Requirement: The provider contract does not define a generalized personal-KB platform
The Hearsay knowledge-store contract SHALL remain limited to capabilities required by Hearsay's indexing and retrieval use cases and SHALL NOT require schemas, APIs, or lifecycle behavior for unrelated personal-data domains or future external applications.

#### Scenario: A future unrelated personal-data use case is proposed
- **WHEN** a capability is needed only by another application or personal-data domain
- **THEN** it is not added to the Hearsay store contract solely for speculative future reuse
