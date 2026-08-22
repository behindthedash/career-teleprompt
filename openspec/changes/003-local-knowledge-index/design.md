## Context

The intended personal corpus is small: resume material, project stories, architecture decisions, metrics, role notes, and interview examples. This does not justify a service process or server-grade vector database. The current application already uses `%APPDATA%\\Hearsay` for configuration/model state and has NumPy installed through the transcription stack.

## Goals / Non-Goals

**Goals:**
- Local semantic retrieval with explicit provenance/status metadata.
- Easy incremental rebuilds as the user edits project notes.
- Minimal packaging surface and a replaceable retrieval backend.

**Non-Goals:**
- No multi-user/vector service.
- No web crawler or automatic resume scraping.
- No cloud embedding provider in the MVP.
- No generative answer synthesis.

## Decisions

### D1. Use an explicit corpus manifest plus source files

A corpus root contains a machine-local `corpus.json` manifest listing eligible documents and metadata such as `path`, `title`, `project`, `topics`, `skills`, and required `experience_status`. The source documents remain ordinary Markdown/text/JSON. Explicit manifest membership prevents accidental indexing of unrelated files and makes claim status reviewable.

The corpus root defaults outside the git checkout; tests use synthetic temporary directories.

### D2. Chunk by document structure before size limits

Markdown headings and paragraph boundaries are preferred semantic boundaries. Oversized sections are split to the embedding adapter's supported size while retaining section title and document metadata. Chunk ids are stable hashes of source-relative path + logical section identity + normalized chunk text so refreshes are deterministic.

### D3. Use FastEmbed/ONNX for the first local embedding adapter

Use the lightweight ONNX-based `fastembed` package with an English retrieval model suitable for CPU execution. Keep the model name/configuration in the index metadata. The adapter interface exposes `embed_documents()` and `embed_query()` so another local or cloud provider can be added without changing the corpus/index contract.

Do not import the embedding package from core Hearsay startup modules. The dependency belongs in an optional copilot requirements group/file.

### D4. Persist metadata and vectors in a simple SQLite index

Store source fingerprints, chunks, metadata JSON, embedding-model id/dimension, and embedding vectors in a local SQLite database under `%APPDATA%\\Hearsay\\copilot`. At query time, load the active corpus vectors into a NumPy matrix and compute cosine similarity in-process.

For the expected corpus size this is simpler to package and inspect than LanceDB/Chroma/FAISS while still providing real vector retrieval. Introduce a `KnowledgeIndex` interface so storage can move later without changing downstream cue logic.

### D5. Incremental refresh is source-hash driven

Fingerprint each manifest-listed source plus relevant manifest metadata. Unchanged fingerprints reuse existing chunks/vectors; changed/new sources are re-chunked and embedded; removed sources are deleted transactionally. A changed embedding model/config invalidates all vectors and performs a full rebuild.

### D6. Missing claim status fails safe

`experience_status` is required for any source that can be surfaced in interview cues. Allowed initial values: `implemented`, `prototype`, `design`, `hypothetical`. A manifest validation error names missing/invalid sources before indexing them. Downstream code never infers implemented status from absence.

## Risks / Trade-offs

- **Brute-force NumPy search does not scale to huge corpora.** Accepted; personal interview corpora are small. The interface allows a vector DB later.
- **Embedding package/model increases installer size.** Keep it optional and measure packaging in change 015; base Hearsay startup cannot import it.
- **Semantic retrieval can miss exact names/metrics.** Change 005 may add a small lexical boost over the vector results; this change exposes metadata/text needed for that.

## Files Expected to Change

- `src/hearsay/knowledge/__init__.py`
- `src/hearsay/knowledge/corpus.py`
- `src/hearsay/knowledge/chunking.py`
- `src/hearsay/knowledge/embeddings.py`
- `src/hearsay/knowledge/index.py`
- `requirements-copilot.txt`
- `tests/test_knowledge_index.py`
- `tests/fixtures/knowledge/` with synthetic content only

## Verification

Create a synthetic corpus with multiple projects and experience statuses. Verify initial index, no-op refresh, one-file edit, removal, full embedding-model invalidation, offline query after cache warmup, and semantic ranking against representative questions.
