## 1. Content model
- [ ] 1.1 Add `PreparedDocument` and `PreparedSection` immutable models with id, title, display text, normalized match text, order, and source path.
- [ ] 1.2 Implement Markdown/plain-text parsing with deterministic section ids.
- [ ] 1.3 Add source reload/change detection without embedding UI behavior.

## 2. Tests
- [ ] 2.1 Cover headings, outline bullets, prose, plain text, empty files, Unicode, and stable ids across reload.
- [ ] 2.2 Use synthetic fixtures only; commit no real interview material.

## 3. Verification
- [ ] 3.1 Load a representative local Markdown outline and inspect ordered sections from a small CLI/test harness.
