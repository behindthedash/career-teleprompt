## Decisions

### D1. Output mode is generic session policy
Use `persist_transcript` and `live_only`; Interview Copilot simply chooses `live_only` by default.

### D2. Normal Hearsay default does not change
Existing start-recording actions continue to persist transcripts unless the user explicitly selects live-only.

### D3. UI wording avoids promises about third-party apps
Hearsay can guarantee it does not create its own transcript file in live-only mode, not that Zoom/Teams or the OS stores nothing.

### D4. No delete-after-write
The writer is not created for live-only sessions.

## Expected Files
- session/output policy modules from change 002
- tray/settings UI
- tests
