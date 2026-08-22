## Why

Epic [`001-live-interview-copilot`](../../epics/001-live-interview-copilot.md) is useful only if retrieved evidence can be absorbed without pulling attention away from the interviewer. The existing `LiveTranscriptWindow` is a large transcript viewer and explicitly takes focus when shown; the interview cue needs a separate compact, always-on-top, non-focus-stealing projection near the webcam.

## What Changes

- Add a compact Windows cue overlay that renders the structured `InterviewCue` from change 005.
- Keep the overlay always-on-top when enabled and allow the user to position/resize it near the webcam.
- Update cue contents on the tkinter thread without stealing keyboard/mouse focus from Zoom/Teams during background refresh.
- Render recommended story, bounded supporting bullets, status/provenance markers, and optional role-bridge material with visually distinct claim status.
- Add manual show/hide, clear, pin/topmost, font-size, width/opacity, and position persistence controls appropriate for interview use.
- Recover saved geometry onto a visible monitor/work area when display topology changes.
- Provide safe `listening`, `retrieving`, `ready`, `no match`, and `unavailable` states without turning the overlay into a chat client.

## Capabilities

### New Capabilities

- `interview-cue-overlay`: compact always-on-top cue presentation, safe background updates, focus behavior, controls, and persisted visible geometry.

### Modified Capabilities

None.

## Impact

- New `src/hearsay/ui/cue_overlay.py` plus small reusable window/geometry helpers if needed.
- `AppConfig`/settings gain overlay presentation preferences only; cue content itself is transient.
- No meeting-application API integration and no claim that the overlay is hidden from screen sharing.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `relevant evidence is retrieved -> concise cue appears near the webcam`.

A simulated background cue update must become visible in the overlay while another Windows application remains foreground, and the window must stay usable across hide/show and monitor-layout changes.
