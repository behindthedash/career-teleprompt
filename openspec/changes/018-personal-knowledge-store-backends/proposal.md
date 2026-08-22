## Why

Change 003 defines a local interview knowledge index. The same curated resume/project knowledge can be the beginning of a broader personal knowledge base. The user also has a cloud server capable of hosting PostgreSQL with pgvector, which can provide durable cross-device storage while preserving a fully local option.

## What Changes

- Introduce a `KnowledgeStore` provider contract used by indexing and retrieval.
- Keep the existing local SQLite + NumPy implementation as the offline/default provider.
- Add an optional PostgreSQL + pgvector provider with equivalent document/chunk/provenance semantics.
- Introduce collections/namespaces so interview material can coexist with future personal KB domains without mixing retrieval indiscriminately.
- Store embedding-model identity/dimension with each collection and refuse incompatible writes/searches until re-indexed.
- Keep database credentials outside committed files and ordinary AppConfig secrets; support environment/secret injection and TLS settings.
- Add schema bootstrap/migration tooling for a private PostgreSQL database and `CREATE EXTENSION IF NOT EXISTS vector` capability checks.

## Capabilities

### New Capabilities
- `personal-knowledge-store`: provider-neutral durable document/chunk/embedding storage with provenance, collections, and retrieval.
- `pgvector-knowledge-store`: optional PostgreSQL/pgvector implementation of that contract.

## Modified Capabilities

None yet. `003-local-knowledge-index` is an active unarchived OpenSpec change, so this change composes at its repository boundary rather than pretending an archived main spec exists.

## Product-Level Merge Gate

The same synthetic corpus can be indexed and queried through both local and pgvector providers with materially equivalent top-k results/metadata, while Hearsay still starts and works normally with no database configured.
