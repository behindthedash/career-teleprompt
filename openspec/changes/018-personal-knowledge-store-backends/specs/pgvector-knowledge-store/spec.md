## Purpose

Implements the personal knowledge store contract using private PostgreSQL with pgvector.

## ADDED Requirements

### Requirement: pgvector capability is validated before use
#### Scenario: Database lacks vector extension
- **WHEN** the provider initializes
- **THEN** it either installs `vector` when the configured database role is authorized to do so or reports the exact prerequisite without partially creating the KB schema

### Requirement: Vector search uses collection-compatible embeddings
#### Scenario: Query embedding is valid
- **WHEN** a query vector matches the collection's recorded model/dimension
- **THEN** the provider returns top-k chunks ordered by cosine similarity with metadata/provenance intact

### Requirement: Remote credentials are secret material
#### Scenario: Database is configured
- **WHEN** the application loads connection information
- **THEN** passwords/connection strings are not written to committed configuration, logs, transcript files, or cue output

### Requirement: Remote connections support TLS policy
#### Scenario: Cloud Postgres is configured with verification
- **WHEN** the provider connects
- **THEN** it honors the configured SSL mode and certificate verification settings rather than downgrading transport silently

### Requirement: Schema can be bootstrapped reproducibly
#### Scenario: Empty private database is prepared
- **WHEN** the KB bootstrap/migration command runs
- **THEN** required extension/schema/tables/indexes are created idempotently and provider health reports the resulting schema version
