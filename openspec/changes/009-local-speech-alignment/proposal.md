## Why

A fixed-speed teleprompter makes the speaker follow the scroll. Epic 002 instead needs the prepared content to follow finalized Local microphone speech while tolerating paraphrase, repetition, pauses, and skipped sections.

## What Changes

- Consume Local transcript events from change 001.
- Maintain alignment state against prepared sections from change 008.
- Score nearby candidate sections using fuzzy lexical matching first, with an optional semantic fallback behind the same interface.
- Emit active-section, confidence, and recovery events.
- Hold position when confidence is insufficient; never jump solely because time elapsed.

## Capabilities

### New Capabilities
- `local-speech-alignment`: confidence-based position tracking between finalized Local speech and prepared sections.

## Product-Level Merge Gate

Synthetic speech fixtures prove natural paraphrase advances appropriately, repetition does not over-advance, and low-confidence speech holds position.
