# Epic 002 — Upstream Readiness and Reusable Host Primitives

## Business Objective

Keep the fork maintainable against `parkscloud/Hearsay` and make generic improvements independently reviewable/contributable upstream, while consumer applications evolve outside this repository.

## Architectural Principles

1. **Generic means consumer-independent.** A change belongs here only when it is useful without the interview copilot.
2. **Optional dependencies stay optional.** Base Hearsay startup and packaging must not require downstream application libraries.
3. **Reusable UI primitives are infrastructure, not product UI.** Generic topmost-window/geometry helpers may live here; interview cue layout and teleprompter behavior do not.
4. **Upstream patches stay narrow.** Avoid bundling fork-specific product behavior with generic host improvements.
5. **The fork remains syncable.** Prefer additive seams over invasive rewrites.

## Feature Decomposition

### 014 — Compact Topmost Window Primitives
Provide narrowly reusable Windows/tkinter helpers for topmost compact windows, safe background-thread projection, geometry persistence, and visible-monitor recovery. No interview or teleprompter content semantics.

### 015 — Optional Consumer Dependency Isolation
Ensure optional extension/consumer support cannot make base Hearsay imports, startup, tests, or packaging dependent on RAG/embedding/database libraries.

### 016 — Upstream Contribution Workflow
Document and enforce how generic changes are separated, tested, and proposed back to `parkscloud/Hearsay`.

## Non-Goals

- No interview overlay implementation.
- No teleprompter UI implementation.
- No vector database or knowledge-store provider.
- No consumer plugin loader/marketplace in this epic.
- No requirement that upstream accept any fork change.

## Acceptance Journey

1. Base Hearsay installs/runs with only its normal dependencies.
2. Generic extension-host changes have focused tests that contain no interview/RAG fixtures.
3. Reusable topmost-window helpers can support an external consumer without importing that consumer.
4. A candidate upstream patch can be prepared without dragging in consumer-specific code or dependencies.

## Success Metrics

- Base import/startup remains independent of consumer dependencies.
- Upstream-ready commits are independently cherry-pickable.
- Generic tests use only synthetic transcription/UI data.
- No personal or interview-specific data appears in upstream-facing changes.

## Dependencies

Build on Epic 001's generic event/session contracts. Consumer projects may depend on these host capabilities; Hearsay must not depend back on consumers.
