## Why

Change 003 defines Hearsay's interview knowledge index using a local store. Hearsay should also be able to use an explicitly configured PostgreSQL database with pgvector for durable remote storage without changing the indexing or retrieval logic and without making the application server-dependent.

This change is intentionally scoped to Hearsay's knowledge-retrieval needs. It does not define or own a generalized personal knowledge platform. A future standalone personal-KB service may reuse or replace this schema, but that is outside this repository's responsibility.

## What Changes

- Introduce a Hearsay-scoped `KnowledgeStore` provider contract used by the existing knowledge indexing and retrieval layer.
- Keep the local SQLite + NumPy implementation as the offline/no-server provider.
- Add an optional PostgreSQL + pgvector provider with equivalent Hearsay document/chunk/provenance semantics.
- Support explicit collections/namespaces only as needed to keep Hearsay retrieval scopes separate, for example career evidence versus target-specific interview preparation.
- Store embedding-model identity and dimension with a collection and refuse incompatible writes/searches until the collection is re-indexed.
- Keep database credentials outside committed files and ordinary logged configuration; support environment/secret injection and explicit TLS settings.
- Add reproducible schema bootstrap/migration tooling for the Hearsay pgvector provider, including validation of the `vector` extension.
- Preserve degraded behavior: an unavailable remote store may disable knowledge cues but must not interfere with audio capture or transcription.

## Capabilities

### New Capabilities
- `knowledge-store-provider`: the provider-neutral storage/retrieval contract Hearsay's knowledge layer consumes.
- `pgvector-knowledge-store-provider`: optional PostgreSQL/pgvector implementation of that contract.

## Modified Capabilities

None yet. `003-local-knowledge-index` is an active unarchived OpenSpec change, so this change composes at its storage boundary rather than modifying an archived main capability.

## Non-Goals

- Defining a standalone personal knowledge-base product or service.
- Owning schemas or APIs for unrelated future agents, notes applications, or personal-data domains.
- Multi-user/multi-tenant authorization, synchronization between clients, or a generic knowledge ingestion platform.
- Requiring PostgreSQL for normal Hearsay operation.

## Product-Level Merge Gate

The same synthetic Hearsay interview corpus can be indexed and queried through both local and pgvector providers with equivalent content/provenance semantics and materially equivalent top-k retrieval, while Hearsay still starts and records normally with no database configured.
