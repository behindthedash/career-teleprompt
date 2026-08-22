## Decisions

### D1. Extract only observed duplication
The primitive owns topmost, geometry, opacity, persisted placement, and non-forced-focus update conventions. It does not own text layout, cues, scripts, or hotkeys.

### D2. Composition is preferred over a deep window class hierarchy
Provide helper/controller functions or a thin base class; avoid making every future window inherit a large framework.

### D3. Windows-specific focus behavior gets manual acceptance
Tkinter unit tests cannot fully prove foreground behavior; maintain a Windows checklist.

### D4. Existing `LiveTranscriptWindow` need not migrate immediately
Only migrate it if doing so reduces code without behavior risk.

## Expected Files
- `src/hearsay/ui/topmost.py`
- cue/teleprompter windows refactored to consume it
