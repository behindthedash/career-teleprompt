## Why

The cue overlay and teleprompter both require repeatable Windows behavior for compact topmost windows, position persistence, opacity, and updates that do not intentionally steal focus. Duplicating that behavior creates drift.

## What Changes

- Extract a small reusable topmost-window helper/base for Hearsay `CTkToplevel` projections.
- Centralize geometry persistence, topmost configuration, opacity clamping, and safe show/update semantics.
- Keep content rendering and domain state outside the primitive.

## Capabilities

### New Capabilities
- `compact-topmost-window-primitives`: reusable UI behavior for compact always-on-top Hearsay windows.

## Impact

Potential upstream contribution: maybe, after proving two real consumers.
