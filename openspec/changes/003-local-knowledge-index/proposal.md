## Why

Epic [`001-live-interview-copilot`](../../epics/001-live-interview-copilot.md) needs a private, queryable source of truthful resume/project evidence. The corpus is small enough that a server-grade vector database would add packaging and operational complexity before it adds product value, but the retrieval contract should remain swappable later.

## What Changes

- Add a user-selected local knowledge corpus for Markdown/text/JSON material stored outside the public repository by default.
- Require provenance and experience-status metadata so implemented work, prototypes, design knowledge, and hypothetical role ideas cannot be silently conflated.
- Chunk documents into meaningful semantic units and create local embeddings for each chunk.
- Persist a lightweight local index plus source hashes so unchanged files do not need to be re-embedded on every rebuild.
- Provide a retrieval API/test harness that returns ranked chunks with metadata and source references.
- Keep indexing and retrieval local after the embedding model is installed/cached; no cloud provider is required.

## Capabilities

### New Capabilities

- `local-knowledge-index`: local corpus ingestion, semantic indexing, metadata/provenance preservation, incremental refresh, and top-k semantic retrieval.

### Modified Capabilities

None.

## Impact

- New `src/hearsay/knowledge/` package and local index files under `%APPDATA%\\Hearsay`.
- New optional copilot embedding dependency, isolated from base startup/import paths.
- User-owned source corpus remains outside the repository and is never bundled into installers.
- Synthetic fixtures are added for tests; no real resume/project content is committed.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `coherent interviewer question -> local personal corpus search -> relevant experience returned with provenance`.

The feature is ready when a synthetic corpus can be indexed, incrementally refreshed, and queried locally with relevant top results while preserving `experience_status` and source identity.
