## 1. Corpus contract

- [ ] 1.1 Add corpus-manifest models/validation for explicit source membership, project/topics/skills, and required `experience_status` values (`implemented`, `prototype`, `design`, `hypothetical`). Files: `src/hearsay/knowledge/__init__.py`, `src/hearsay/knowledge/corpus.py`.
- [ ] 1.2 Implement supported Markdown/text/JSON source loading with stable source fingerprints and clear validation errors; do not scan arbitrary files outside manifest membership. File: `src/hearsay/knowledge/corpus.py`.
- [ ] 1.3 Implement structure-aware chunking with stable chunk ids and inherited provenance/status metadata. File: `src/hearsay/knowledge/chunking.py`.

## 2. Local embeddings and persistence

- [ ] 2.1 Add an optional copilot dependency file containing the chosen FastEmbed/ONNX dependency without adding it to base `requirements.txt`. File: `requirements-copilot.txt`.
- [ ] 2.2 Implement a lazy local embedding adapter with model/cache configuration and document/query embedding APIs; importing/running base Hearsay must not require this dependency. File: `src/hearsay/knowledge/embeddings.py`.
- [ ] 2.3 Implement the SQLite knowledge index: schema/version metadata, sources, chunks, metadata, vector blobs, and transactional replace/delete operations. File: `src/hearsay/knowledge/index.py`.
- [ ] 2.4 Implement incremental refresh from source fingerprints and full invalidation when embedding configuration changes. File: `src/hearsay/knowledge/index.py`.
- [ ] 2.5 Implement bounded top-k cosine retrieval using the persisted vectors and return chunk text plus full provenance/status metadata. File: `src/hearsay/knowledge/index.py`.

## 3. Tests and fixtures

- [ ] 3.1 Add only synthetic knowledge fixtures covering implemented, prototype, design, hypothetical, missing-status, and multiple-project cases. Files: `tests/fixtures/knowledge/**`.
- [ ] 3.2 Add tests for initial index, no-op refresh, changed source, removed source, model invalidation, stable ids, and missing/invalid claim status. File: `tests/test_knowledge_index.py`.
- [ ] 3.3 Add retrieval evaluation cases proving representative queries return relevant chunks with provenance and that hypothetical content retains its status. File: `tests/test_knowledge_index.py`.
- [ ] 3.4 Add an offline-after-cache test/harness that fails if the retrieval path attempts an unexpected network call once the model is available locally.

## 4. Verification

- [ ] 4.1 Run the knowledge-index tests and existing base Hearsay tests in an environment with only base dependencies to prove optional imports do not break startup.
- [ ] 4.2 On Windows with copilot dependencies installed, index a synthetic external corpus, restart the app/test harness, and confirm persisted local retrieval works without re-embedding unchanged sources.
