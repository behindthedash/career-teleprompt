## Decisions

### D1. Output policy is session-scoped
Use a small enum/value object such as `SessionOutputMode.PERSISTED` and `LIVE_ONLY` rather than an interview-specific boolean.

### D2. No write-then-delete
If live-only is selected, do not construct `MarkdownWriter` for that session.

### D3. Events and live UI are independent of persistence
The transcript queue drain still feeds live UI and transcript event publication.

### D4. UI wording is precise
Hearsay may say it does not save its own transcript file; it does not make claims about Zoom, Teams, the OS, or other software.
