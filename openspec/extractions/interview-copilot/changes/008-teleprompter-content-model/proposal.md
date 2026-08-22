## Why

Epic 002 needs prepared material that can be followed by speech without forcing verbatim reading. Raw text has no stable section identity, anchors, or metadata for recovery after a skip.

## What Changes

- Define a prepared-content document model for Markdown scripts and talking-point outlines.
- Parse headings and explicit separators into stable sections with ids, titles, text, and optional keywords.
- Preserve source order and source-file provenance.
- Support reload when the source file changes without coupling content parsing to the alignment engine.

## Capabilities

### New Capabilities
- `teleprompter-content`: loading, normalizing, validating, and exposing prepared interview content as stable ordered sections.

## Impact

New `src/hearsay/teleprompter/content.py` plus fixtures/tests. No microphone, transcription, or UI behavior changes.

## Product-Level Merge Gate

A Markdown interview outline can be loaded into stable sections and reloaded deterministically with the same ids when unchanged.
