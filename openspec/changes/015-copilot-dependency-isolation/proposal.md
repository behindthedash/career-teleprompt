## Why

Embedding, pgvector, Postgres, and optional synthesis dependencies should not become mandatory for the lightweight base Hearsay transcription application or complicate upstream sync.

## What Changes

- Separate core runtime dependencies from copilot/knowledge extras.
- Lazy-import optional retrieval/storage providers only when configured.
- Define PyInstaller build behavior for a base build and a copilot-enabled build.
- Fail with actionable setup guidance when an optional feature is selected but its dependency is absent.

## Capabilities

### New Capabilities
- `copilot-dependency-isolation`: optional-feature packaging/import boundaries that preserve base Hearsay startup.

## Impact

Fork maintenance concern; not necessarily upstreamed.
