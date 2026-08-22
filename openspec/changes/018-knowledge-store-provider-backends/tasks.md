## 1. Hearsay knowledge-store provider contract
- [ ] 1.1 Introduce `KnowledgeStore` plus the collection/document/chunk/query-result/health models needed by Hearsay indexing and retrieval. Refactor change 003's local index behind this contract without adding speculative APIs for unrelated applications.
- [ ] 1.2 Require an explicit retrieval collection/scope and collection-bound embedding model + dimension compatibility.

## 2. Local provider
- [ ] 2.1 Adapt the SQLite + NumPy implementation to the Hearsay provider contract with transactional document replacement and deterministic metadata/provenance behavior.
- [ ] 2.2 Add synthetic conformance fixtures reusable by every Hearsay knowledge-store provider.

## 3. PostgreSQL + pgvector provider
- [ ] 3.1 Add optional `psycopg` + `pgvector` dependencies behind change 015's optional-dependency boundary; no import/connect attempt occurs when the provider is not selected.
- [ ] 3.2 Implement connection/health, Hearsay-owned collection/document/chunk schema, transactional upsert/reindex, cosine top-k query, and metadata/provenance round-trip.
- [ ] 3.3 Add an idempotent bootstrap/migration command that validates or creates `vector` only when permitted and creates clearly Hearsay-owned database objects/schema versioning.
- [ ] 3.4 Baseline exact vector search first. Add HNSW only after representative corpus profiling demonstrates value and the collection vector dimension is known.

## 4. Secrets and network behavior
- [ ] 4.1 Support `HEARSAY_KB_DATABASE_URL` or an injected secret-provider equivalent without persisting the secret in AppConfig, logs, transcript output, or cue output.
- [ ] 4.2 Support explicit PostgreSQL SSL/TLS mode and redact connection material from errors/diagnostics.
- [ ] 4.3 Surface remote-store unavailable/degraded state to knowledge-dependent features without affecting transcription or ordinary app startup.

## 5. Provider parity tests
- [ ] 5.1 Run the same synthetic Hearsay career/interview corpus against local and temporary PostgreSQL+pgvector providers.
- [ ] 5.2 Assert equivalent content/provenance/experience status, explicit collection scoping, atomic reindex behavior, and materially equivalent top-k relevance.
- [ ] 5.3 Add a PostgreSQL integration test gated by `HEARSAY_TEST_PG_URL`; skip explicitly when unavailable rather than claiming pgvector coverage.

## 6. Hearsay retrieval proof and documentation
- [ ] 6.1 Use synthetic `career` and target-specific interview-preparation collections and prove a career-scoped query cannot return hypothetical target-specific material unless that scope is explicitly included.
- [ ] 6.2 Document optional private PostgreSQL+pgvector setup without committing actual hostnames, credentials, personal corpus material, or implying that the database is a standalone personal-KB product.
- [ ] 6.3 Document the extraction boundary: if unrelated applications later need shared knowledge ownership/API semantics, that becomes a separate project/change rather than expanding the Hearsay provider contract speculatively.
