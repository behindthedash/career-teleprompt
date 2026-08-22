## Purpose

Defines provider-neutral durable storage for a curated personal knowledge base.

## ADDED Requirements

### Requirement: Knowledge persistence is provider neutral
The indexing/retrieval layer SHALL use a common store contract so local and remote implementations expose equivalent document, chunk, provenance, collection, and query semantics.

#### Scenario: Same corpus uses either provider
- **WHEN** a curated corpus is indexed through the local provider and through a configured pgvector provider
- **THEN** both expose the same chunk content, provenance, experience status, and collection identity to retrieval consumers

### Requirement: Knowledge is isolated by collection
#### Scenario: Interview query targets career collection
- **WHEN** retrieval is scoped to `career`
- **THEN** chunks from unrelated collections are not returned unless those collections were explicitly included

### Requirement: Collection embedding configuration is consistent
#### Scenario: Different embedding model is used
- **WHEN** a writer attempts to insert vectors whose model/dimension does not match the collection
- **THEN** the store refuses the write and requires an explicit re-index/rebuild path

### Requirement: Re-indexing a document is atomic
#### Scenario: Existing document changes
- **WHEN** its new chunks are persisted
- **THEN** consumers observe either the prior complete chunk generation or the new complete generation, not a partial mixture

### Requirement: Store failures do not break transcription
#### Scenario: Remote KB is unavailable
- **WHEN** PostgreSQL cannot be reached during an interview session
- **THEN** core Hearsay transcription remains operational and knowledge features expose an explicit unavailable/degraded state
