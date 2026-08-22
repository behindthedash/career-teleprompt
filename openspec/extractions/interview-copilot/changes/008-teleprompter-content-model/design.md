## Context

Epic 002 requires speech alignment against logical answer passages, not a flat character stream.

## Goals / Non-Goals

**Goals:** deterministic parsing, stable section identity, outline + prose support, source provenance.

**Non-Goals:** no speech matching, RAG, editor, or cloud synchronization.

## Decisions

### D1. Markdown is the primary authoring format
Use headings as section boundaries. Plain text remains supported as one section. Optional front matter may supply document title and section metadata later.

### D2. Section ids derive from source-relative order plus normalized heading/content digest
Unchanged content retains stable identity across reload. Editing one section does not renumber unrelated sections when explicit headings are present.

### D3. Alignment text is normalized separately from display text
Keep original Markdown/plain text for display while exposing a normalized lexical representation for matching.

### D4. Prepared content stays outside the public repository by default
The loader accepts user-selected files; real interview scripts are not copied into project fixtures.

## Expected Files
- `src/hearsay/teleprompter/content.py`
- `src/hearsay/teleprompter/__init__.py`
- `tests/test_teleprompter_content.py`
