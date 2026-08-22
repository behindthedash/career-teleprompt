## Purpose

Implements Hearsay's knowledge-store provider contract using an explicitly configured PostgreSQL database with pgvector.

## ADDED Requirements

### Requirement: pgvector capability is validated before provider use
The provider SHALL validate that the configured database can support the pgvector extension and Hearsay-owned schema before accepting indexing or retrieval work.

#### Scenario: Database lacks the vector extension
- **WHEN** the provider initializes against a database where `vector` is unavailable
- **THEN** it either installs the extension when the configured role is explicitly authorized to do so or reports the exact prerequisite without partially creating the Hearsay knowledge schema

### Requirement: Vector search preserves the provider contract
The pgvector provider SHALL perform top-k vector retrieval using a collection-compatible embedding and return chunk content, score, provenance, experience status, and metadata using the same contract expected by Hearsay's local provider.

#### Scenario: Query embedding is compatible
- **WHEN** a query vector matches the target collection's recorded embedding model and dimension
- **THEN** the provider returns top-k chunks ordered by the configured cosine-similarity semantics with Hearsay metadata and provenance intact

### Requirement: Remote credentials are secret material
Database credentials and complete connection strings SHALL NOT be stored in committed repository files, normal transcript files, cue output, or logs.

#### Scenario: PostgreSQL is configured through an injected secret
- **WHEN** the application loads the provider connection information
- **THEN** the secret can be used to establish the connection but is redacted from configuration diagnostics and error/log output

### Requirement: Remote connections honor explicit TLS policy
The pgvector provider SHALL support an explicit PostgreSQL SSL/TLS policy and SHALL NOT silently downgrade the configured transport behavior.

#### Scenario: Verified TLS is configured
- **WHEN** the provider connects to the remote database
- **THEN** it uses the configured SSL mode and certificate verification settings or fails visibly if those requirements cannot be satisfied

### Requirement: Hearsay schema bootstrap is reproducible and application-scoped
The provider SHALL provide an idempotent bootstrap/migration path for the tables, indexes, and schema version Hearsay owns. The database objects SHALL be named or namespaced so their Hearsay ownership is clear and they do not imply a universal personal-KB schema.

#### Scenario: Empty private database is prepared
- **WHEN** the Hearsay knowledge-store bootstrap/migration command runs
- **THEN** the required pgvector capability and Hearsay-owned collection/document/chunk structures are created or validated idempotently and provider health reports the resulting schema version

### Requirement: PostgreSQL remains optional
The pgvector provider SHALL be loaded only when explicitly selected/configured and SHALL NOT become a prerequisite for normal Hearsay startup, recording, or local knowledge retrieval.

#### Scenario: No remote database is configured
- **WHEN** Hearsay starts with the local provider or with knowledge features disabled
- **THEN** no PostgreSQL connection is attempted and core Hearsay behavior remains available
