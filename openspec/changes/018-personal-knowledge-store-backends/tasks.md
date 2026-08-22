## 1. Provider contract
- [ ] 1.1 Introduce `KnowledgeStore`, collection/document/chunk/query result models, health/stats, and provider factory. Refactor change 003 local index behind this contract.
- [ ] 1.2 Add collection metadata with embedding model, dimension, and schema version; require explicit collection scope on queries.

## 2. Local provider
- [ ] 2.1 Adapt SQLite + NumPy store to the contract with transactional document replacement and deterministic metadata/provenance behavior.
- [ ] 2.2 Add conformance fixtures reusable by every provider.

## 3. PostgreSQL + pgvector provider
- [ ] 3.1 Add optional `psycopg` + `pgvector` dependencies behind change 015's optional boundary.
- [ ] 3.2 Implement connection/health, collection/document/chunk schema, transactional upsert/reindex, cosine top-k query, and metadata round-trip.
- [ ] 3.3 Add bootstrap/migration command that validates/creates the `vector` extension as permitted and records schema version.
- [ ] 3.4 Add dimension-compatible pgvector index creation (HNSW after baseline/exact-search validation) and explain/analyze benchmark for representative corpus sizes.

## 4. Secrets and network behavior
- [ ] 4.1 Support `HEARSAY_KB_DATABASE_URL` (or injected secret provider) without persisting secrets in AppConfig/logs.
- [ ] 4.2 Support explicit SSL mode/config and redact connection material from errors.
- [ ] 4.3 Surface remote-store unavailable/degraded state without affecting transcription.

## 5. Provider parity tests
- [ ] 5.1 Run the same synthetic corpus conformance suite against local and temporary Postgres+pgvector providers.
- [ ] 5.2 Assert metadata, experience status, collection scoping, atomic reindex, and top-k relevance parity within defined tolerance.
- [ ] 5.3 Add an integration test gated by `HEARSAY_TEST_PG_URL`; skip clearly when unavailable rather than silently claiming pgvector coverage.

## 6. Personal KB proof
- [ ] 6.1 Create synthetic `career` and `personal-notes` collections and prove interview retrieval searches only `career` by default.
- [ ] 6.2 Document private-server setup steps without committing the user's actual host, credentials, or personal corpus.
