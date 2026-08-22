## Decisions

### D1. Output mode is a generic Hearsay session policy
Use an explicit persisted-versus-live-only policy owned by the host. Downstream applications request a supported mode; they do not bypass or replace the writer lifecycle themselves.

### D2. Normal Hearsay default does not change
Existing start-recording actions continue to persist transcripts unless the user or supported caller explicitly selects live-only.

### D3. Live-only still supports transcript events
The host suppresses transcript-file creation/finalization but continues finalized event publication and normal in-memory/live behavior.

### D4. UI wording avoids promises about third-party apps
Hearsay can guarantee it does not create its own transcript file in live-only mode, not that conferencing software or the operating system stores nothing.

### D5. No delete-after-write
The writer is not created for live-only sessions. Privacy behavior should not depend on deleting an artifact after creation.

### D6. Supersede rather than layer on change 002
The earlier `002-ephemeral-copilot-session` is removed from the active registry. Implementation should use this generic policy directly rather than build an interview-specific wrapper in Hearsay.

## Expected Files
- session/output policy model
- `HearsayApp` session startup/teardown
- tray/settings UI where user-selectable
- tests for stop/failure/quit paths
