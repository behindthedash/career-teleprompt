## Context

`LiveTranscriptWindow` is a `CTkToplevel` designed for reading a running transcript: it opens at 700x500 and `show()` calls `focus_force()`. The cue overlay has opposite UX constraints: small, near-camera, updated frequently, topmost, and not activated by background work. Existing `safe_after()` is the required cross-thread tkinter update mechanism.

## Goals / Non-Goals

**Goals:**
- Glanceable structured cue rendering.
- Stable topmost/non-focus-stealing behavior on Windows.
- Persisted, recoverable geometry/readability settings.
- UI updates safely marshalled to the tkinter thread.

**Non-Goals:**
- No transparent click-through overlay in the MVP.
- No guarantee that Zoom/Teams screen sharing excludes the window.
- No rich markdown/browser/chat surface.
- No retrieval logic inside the UI class.

## Decisions

### D1. Create a separate `CueOverlayWindow`

Use a dedicated `customtkinter.CTkToplevel` rather than modifying `LiveTranscriptWindow`. Default geometry is a narrow horizontal/vertical card suitable for placement just below the webcam. It uses `attributes("-topmost", True)` when pinned and never calls `focus_force()` for cue refreshes.

Showing the window from an explicit user action may activate it briefly so it can be moved/configured; background `render_cue()` updates never activate it.

### D2. Render structured fields, not generated markup

`CueOverlayWindow` accepts a UI-safe projection of `InterviewCue`. Dedicated labels/frames render query/intent, recommended story, supporting bullets, role bridge, and source/status indicators. Limit visual content to the cue model bounds; source document bodies are never rendered automatically.

### D3. All external updates use `safe_after`

Retrieval workers do not touch tkinter objects. The app/session layer schedules `render_state()`/`render_cue()` through `safe_after(root, 0, ...)`. The overlay defensively ignores updates after destruction/shutdown.

### D4. Persist presentation settings through `AppConfig`

Add only presentation state: geometry/position, font scale, opacity, and topmost preference. No cue text or interview transcript is persisted. On startup, validate saved coordinates against current Windows monitor/work-area bounds and clamp/recenter if necessary.

Use Win32 monitor APIs via `ctypes` only where tkinter cannot reliably determine multi-monitor work areas; avoid a new dependency for this small platform-specific need.

### D5. Keep manual controls low-risk

Provide tray show/hide plus controls within the overlay for clear, pin, font +/- and opacity. If a global hide/show hotkey is added, use Windows `RegisterHotKey` through a small isolated helper and treat registration failure as non-fatal; do not install a keyboard-hook dependency for MVP.

### D6. State transitions clear stale visual authority

When a new query enters `retrieving`, dim/clear the old cue body and show the new query text rather than leaving an old answer visually current. `no_match` and `unavailable` similarly replace the cue status without implying evidence exists.

## Risks / Trade-offs

- **Always-on-top behavior varies across full-screen apps.** Target normal desktop Zoom/Teams windows; document unsupported exclusive full-screen behavior if found.
- **No capture exclusion.** Deliberate: `SetWindowDisplayAffinity` can be explored later, but the MVP must not promise invisibility during screen sharing.
- **Small window can truncate useful context.** Favor bounded cues and adjustable size/font over scrolling prose.

## Files Expected to Change

- `src/hearsay/ui/cue_overlay.py`
- `src/hearsay/ui/window_geometry.py` (if monitor recovery needs separation)
- `src/hearsay/config.py`
- `src/hearsay/ui/settings_window.py`
- `src/hearsay/ui/tray.py` for show/hide surface when integration lands
- `tests/test_cue_overlay_model.py` and manual Windows UI acceptance notes

## Verification

Headless/unit tests cover cue-to-view-model formatting, geometry recovery, and config serialization. A Windows manual check keeps Zoom/Notepad foreground while synthetic cues update repeatedly, confirming focus remains with the foreground app and the overlay stays topmost/visible.
