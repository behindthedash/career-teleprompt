## Why

Epic 001's dynamic interview cues and Epic 002's prepared teleprompter are both camera-adjacent aids. If each independently expands, moves, or grabs attention, the combined experience becomes more distracting than helpful.

## What Changes

- Define a shared presentation coordinator for the cue overlay and teleprompter.
- Support independent windows plus an optional compact stacked layout.
- Establish visibility priority so a newly retrieved cue can be noticed without erasing prepared context.
- Preserve separate state/lifecycle for retrieval cues and speech alignment.

## Capabilities

### New Capabilities
- `cue-teleprompter-coexistence`: coordinated layout and attention behavior for dynamic cues and prepared content.

## Product-Level Merge Gate

Both projections operate concurrently in a simulated interview without covering each other, stealing focus, or coupling their domain state.
