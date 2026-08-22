## Context

Change 003 establishes Hearsay's local interview knowledge index. The application can benefit from an optional PostgreSQL + pgvector backend when the user wants durable remote storage, but Hearsay should remain a desktop transcription/interview application rather than become the owner of a generalized personal knowledge platform.

The design problem is therefore narrow: define a stable storage boundary for Hearsay's curated knowledge chunks, preserve the existing local implementation, and add a remote provider with equivalent semantics.

## Goals / Non-Goals

**Goals:** one Hearsay knowledge-store contract, local/offline default, optional pgvector provider, provenance and `experience_status` fidelity, explicit retrieval scoping, safe credential/TLS behavior, deterministic rebuilds, and provider conformance tests.

**Non-Goals:** no standalone personal-KB service, public SaaS, generic notes platform, future-agent API, multi-tenant auth, document crawler, cross-device sync engine, or automatic ingestion of unrelated private accounts.

## Decisions

### D1. Define a Hearsay-scoped `KnowledgeStore`

Representative operations are `ensure_collection`, `upsert_document`, `replace_document_chunks`, `delete_document`, `query`, `get_chunk`, `health`, and `stats`. Hearsay indexing and retrieval code consume this interface rather than SQL, NumPy, or pgvector directly.

The interface is an application boundary, not a promise that this repository owns a future universal knowledge schema.

### D2. Collections are retrieval scopes, not personal-domain modeling

A collection records a stable name, embedding model id, embedding dimension, schema version, and timestamps. Hearsay uses collections only when it needs to prevent inappropriate retrieval mixing, for example:

- `career` for implemented resume/project evidence;
- a target-specific interview-preparation collection for company/role notes and hypothetical bridges.

This spec does not define `personal-notes`, health, finance, or other future personal domains. Those would belong to whatever system owns a broader personal KB if one is created later.

### D3. PostgreSQL schema separates source documents from chunks

Representative Hearsay-owned schema:

```text
hearsay_kb_collection
  id uuid pk
  name text unique
  embedding_model text
  embedding_dimension int
  schema_version int

hearsay_kb_document
  id uuid pk
  collection_id fk
  source_uri text
  title text
  content_hash text
  metadata jsonb

hearsay_kb_chunk
  id uuid pk
  document_id fk
  ordinal int
  content text
  content_hash text
  experience_status text
  metadata jsonb
  embedding vector(N)
```

The `hearsay_kb_` prefix makes ownership explicit and avoids implying a universal schema. A future extracted KB can migrate or adapt this data deliberately.

### D4. Embedding model and dimension are collection-bound

A collection records the model identity and vector dimension. Writes and queries using an incompatible embedding configuration fail closed and require explicit re-indexing rather than mixing incompatible vectors.

### D5. Cosine similarity is the initial metric

The pgvector provider uses cosine distance and converts results into the same score semantics as the local provider. Exact search is the initial correctness baseline. Add HNSW only after representative corpus profiling shows a need and the collection dimension is known.

### D6. Credentials are injected, not persisted

Support a connection URL from an environment variable such as `HEARSAY_KB_DATABASE_URL` or a future OS credential adapter. Do not commit or log hostnames with credentials, passwords, tokens, or full connection strings. Remote PostgreSQL supports explicit SSL mode, with verified TLS preferred for non-local hosts.

### D7. Remote failure cannot break Hearsay

If the pgvector provider is configured but unavailable, knowledge-dependent features expose unavailable/degraded status. Audio capture, transcription, ordinary transcript output, and other non-knowledge features continue. Do not silently switch to a stale local index unless a future explicit fallback policy is configured.

### D8. Ranking remains outside storage

Provider SQL returns chunks, scores, provenance, and metadata. Interview-specific ranking rules such as `experience_status` preference, exact technology-name boosts, recommended-story selection, and role bridges stay in the retrieval/cue layer. The pgvector provider does not encode interview logic in SQL.

### D9. Future extraction remains possible without being designed now

The schema avoids unnecessary coupling to UI classes or transcript internals, but no generic external API is created. If multiple independent applications later need the same knowledge store, extraction into a separate project/service becomes a separate architectural decision.

## Expected Files

- `src/hearsay/knowledge/store.py`
- `src/hearsay/knowledge/local_store.py`
- `src/hearsay/knowledge/postgres_store.py`
- `src/hearsay/knowledge/schema/*.sql` or equivalent migration assets
- optional dependencies such as `psycopg[binary]` and `pgvector`
- provider conformance tests using synthetic Hearsay interview/career fixtures
