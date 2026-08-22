## Why

Speech alignment is useful only if the current passage is glanceable near the webcam while Zoom/Teams remains the primary application.

## What Changes

- Add a compact always-on-top teleprompter window rendering prepared sections.
- Keep the active passage positioned consistently and visually distinguish current/adjacent sections.
- Add font size, width, opacity, pause/follow, next/previous, and jump controls.
- Persist window geometry/preferences, not script content.
- Apply alignment updates through the tkinter-safe update path.

## Capabilities

### New Capabilities
- `speech-following-teleprompter-ui`: camera-adjacent prepared-content display and manual/follow controls.

## Product-Level Merge Gate

During a simulated Zoom session the teleprompter follows synthetic alignment updates without intentionally stealing focus, and manual controls recover instantly.
