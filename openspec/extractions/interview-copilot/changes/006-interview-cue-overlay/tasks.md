## 1. Overlay view and presentation model

- [ ] 1.1 Add a UI-only cue projection and `CueOverlayWindow` with compact layout for query/intent, recommended story, <=5 supporting points, role bridge, and provenance/status badges. File: `src/hearsay/ui/cue_overlay.py`.
- [ ] 1.2 Implement `listening`, `retrieving`, `ready`, `no_match`, and `unavailable` render states; entering retrieval for a newer query must not leave the previous cue visually authoritative. File: `src/hearsay/ui/cue_overlay.py`.
- [ ] 1.3 Implement topmost/pin behavior and background rendering without `focus_force()` or equivalent activation. File: `src/hearsay/ui/cue_overlay.py`.

## 2. Geometry and controls

- [ ] 2.1 Add persisted overlay geometry, font scale, opacity, and topmost preferences to `AppConfig` with backward-compatible defaults. Files: `src/hearsay/config.py`, `src/hearsay/ui/settings_window.py`.
- [ ] 2.2 Implement monitor/work-area validation so obsolete off-screen saved coordinates recover to a visible default. File: `src/hearsay/ui/window_geometry.py` or equivalent helper.
- [ ] 2.3 Add direct clear/hide/pin/font/opacity controls; add tray show/hide integration hooks without coupling the overlay to retrieval internals. Files: `src/hearsay/ui/cue_overlay.py`, `src/hearsay/ui/tray.py`.
- [ ] 2.4 If a global show/hide hotkey is included, implement it with an isolated Win32 registration helper and make conflicts/failures non-fatal; do not add a keyboard-hook package.

## 3. Thread-safety and tests

- [ ] 3.1 Expose app-facing render methods that are always invoked through `safe_after`; add guard behavior for late updates during shutdown. Files: `src/hearsay/ui/cue_overlay.py`, integration call site later in change 007.
- [ ] 3.2 Add tests for cue projection bounds/status labeling, implemented-vs-hypothetical visual labels, config round trip, and off-screen geometry recovery. File: `tests/test_cue_overlay_model.py`.

## 4. Verification

- [ ] 4.1 On Windows, keep Zoom/Notepad foreground and inject a sequence of synthetic retrieving/ready/no-match cues; confirm focus does not move, the overlay remains topmost, and controls remain usable when explicitly clicked.
- [ ] 4.2 Disconnect/rearrange a monitor or simulate out-of-bounds saved geometry and verify the overlay recovers visibly on next launch.
