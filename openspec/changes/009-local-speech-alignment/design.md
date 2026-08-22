## Context

Transcript events are finalized chunks, not word-by-word timing. Alignment therefore operates at section/utterance granularity.

## Decisions

### D1. Maintain a bounded rolling Local transcript window
Combine recent Local events into a short rolling phrase for scoring. Remote events are ignored.

### D2. Search locally around the current position before global recovery
Score current, previous, and next few sections first. A global scan is used only after repeated low-confidence observations or an explicit manual jump.

### D3. Confidence controls movement
Emit `aligned`, `held`, or `recovered` state. A lower score may update diagnostics but cannot move the teleprompter.

### D4. Lexical matching is mandatory; semantic matching is optional
Start with token normalization plus `SequenceMatcher`/overlap scoring. A semantic adapter may improve paraphrase handling but must not become mandatory for basic teleprompter operation.

### D5. Manual navigation resets the alignment anchor
Next/previous/jump establishes the new authoritative position immediately and clears stale recovery evidence.

## Expected Files
- `src/hearsay/teleprompter/alignment.py`
- `tests/test_speech_alignment.py`
