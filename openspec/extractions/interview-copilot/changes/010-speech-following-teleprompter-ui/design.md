## Decisions

### D1. Separate window from `LiveTranscriptWindow`
A dedicated `CTkToplevel` renders prepared material; transcript UI remains unchanged.

### D2. Discrete section positioning before smooth word scrolling
Center/anchor the active section and show limited surrounding context. Do not implement per-word karaoke behavior until section alignment proves insufficient.

### D3. Topmost without forced focus
Alignment refreshes must never call `focus_force()`. Showing/configuring the window should preserve the meeting application's focus where Windows allows it.

### D4. Manual controls are first-class
Pause follow, resume, previous, next, and jump-to-section work even when alignment is unavailable.

### D5. Persist presentation preferences only
Window geometry, opacity, width, and font size may be stored in AppConfig. Prepared text remains in the user-selected source file.

## Expected Files
- `src/hearsay/ui/teleprompter_window.py`
- `src/hearsay/config.py`
- `src/hearsay/app.py`
