## Context

The expected interview corpus is small enough for local SQLite/NumPy, but a private PostgreSQL+pgvector server creates a useful path toward a durable personal KB shared by future tools. This should be a storage option, not a reason to turn Hearsay into a server-dependent application.

## Goals / Non-Goals

**Goals:** one provider contract, local/offline default, optional durable pgvector, provenance/experience-status fidelity, collection isolation, safe credentials/TLS, deterministic rebuilds.

**Non-Goals:** no public SaaS, multi-tenant auth platform, document crawler, sync conflict engine, or automatic ingestion of private accounts.

## Decisions

### D1. Define a provider-neutral `KnowledgeStore`
Representative operations: `ensure_collection`, `upsert_document`, `replace_document_chunks`, `delete_document`, `query`, `get_chunk`, `health`, and `stats`. Domain retrieval code consumes this interface, not SQL/NumPy directly.

### D2. Collections are first-class
A collection has `id/name`, description, embedding model id, embedding dimension, schema version, and timestamps. Initial examples: `career`, `interview-clearlake`, `personal-notes`. Queries must name one or more collections explicitly; default interview retrieval should not search every personal domain.

### D3. PostgreSQL schema keeps source documents and chunks separate
Representative tables:

```text
kb_collection
  id uuid pk
  name text unique
  embedding_model text
  embedding_dimension int
  schema_version int

kb_document
  id uuid pk
  collection_id fk
  source_uri text
  title text
  content_hash text
  metadata jsonb

kb_chunk
  id uuid pk
  document_id fk
  ordinal int
  content text
  content_hash text
  experience_status text
  metadata jsonb
  embedding vector(N)
```

Use a unique `(document_id, ordinal)`/content identity and transactional replace-on-reindex semantics so partial document updates cannot leave mixed generations.

### D4. Embedding dimension is collection-bound
pgvector indexes need a consistent dimension. A collection records the model/dimension; a different embedding model requires an explicit new collection/rebuild rather than silently mixing vectors.

### D5. Cosine similarity is the initial vector metric
Use pgvector cosine distance and return a normalized score through the provider contract. Add an HNSW index only after collection creation knows the vector dimension. For tiny corpora, exact search is acceptable and can be baseline-tested before indexing.

### D6. Credentials are never stored in the public repo
Support a database URL from an environment variable such as `HEARSAY_KB_DATABASE_URL` or a future OS credential adapter. Do not commit hostnames, usernames, passwords, or personal connection strings. TLS is configurable, with `require`/`verify-full` preferred for remote hosts.

### D7. Cloud failure degrades explicitly
If the configured pgvector store is unavailable, Hearsay transcription continues. Knowledge features show unavailable/degraded state; they do not silently switch to a stale local store unless the user explicitly configured fallback semantics.

### D8. The KB is reusable beyond interviews
Store generic source/provenance metadata and collections. Interview-specific ranking (`experience_status`, target-role bridge) remains in the cue/retrieval layer rather than in PostgreSQL-specific SQL.

## Expected Files
- `src/hearsay/knowledge/store.py`
- `src/hearsay/knowledge/local_store.py`
- `src/hearsay/knowledge/postgres_store.py`
- `src/hearsay/knowledge/schema/*.sql` or migrations
- optional requirements: `psycopg[binary]`, `pgvector`
- provider conformance tests
