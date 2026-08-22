## Decisions

### D1. Core requirements stay minimal
Keep existing transcription/UI dependencies in the base requirements. Put embedding, Postgres/pgvector, and optional LLM dependencies in a separate extras/requirements file.

### D2. Optional imports occur at provider construction
Module import of `hearsay` and normal recording must not import FastEmbed, psycopg, pgvector, or cloud SDKs.

### D3. Build flavors are explicit
Document/build a base Hearsay package and, for the fork, a copilot-enabled package containing selected extras. Do not silently balloon upstream's installer.

### D4. Missing optional dependency is a user-actionable feature error
Selecting a provider without its package returns a clear setup message; it does not crash tray startup.

## Expected Files
- `requirements.txt`
- `requirements-copilot.txt` or packaging extras
- `Hearsay.spec`/fork build spec
- provider modules/tests
