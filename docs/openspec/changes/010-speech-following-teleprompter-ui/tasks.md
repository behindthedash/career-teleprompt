## 1. UI
- [ ] 1.1 Add `TeleprompterWindow` with topmost, configurable geometry, font, opacity, active-section rendering, and no forced focus on updates.
- [ ] 1.2 Add pause/resume, previous/next, and jump controls.
- [ ] 1.3 Persist presentation preferences in `AppConfig`.
- [ ] 1.4 Wire alignment results via `safe_after`.

## 2. Tests / manual acceptance
- [ ] 2.1 Unit-test active-section projection and manual state transitions without Windows audio.
- [ ] 2.2 On Windows, verify Zoom/Teams can remain foreground while updates arrive and geometry survives restart.
