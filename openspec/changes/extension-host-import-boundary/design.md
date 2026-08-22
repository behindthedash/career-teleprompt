## Decisions

### D1. Small public host surface
Expose only stable data/contracts and registration/session-facing APIs under documented modules such as `hearsay.events` / `hearsay.host`.

### D2. Imports cannot start the app
Move any eager UI/audio/model initialization behind explicit application startup or factory functions.

### D3. Consumer dependencies never enter Hearsay
FastEmbed, psycopg, pgvector, LLM SDKs, and Interview Copilot dependencies remain in the consumer repository.

### D4. Enforce with subprocess tests
A clean subprocess imports the public surface and verifies no tray/audio/model side effects occurred.
