# Epic 002 — Upstream Readiness and Host Import Boundary

## Business Objective

Keep the fork maintainable against `parkscloud/Hearsay` and make generic host capabilities independently consumable and independently reviewable/contributable upstream, while downstream applications evolve outside this repository.

## Architectural Principles

1. **Generic means consumer-independent.** A change belongs here only when it is useful without the interview copilot.
2. **The host must be importable cleanly.** A downstream Python application should be able to import the supported event/session API without launching tray UI, starting audio, or importing consumer dependencies.
3. **Consumer dependencies stay in the consumer.** Hearsay does not ship RAG/vector/database/LLM build flavors merely because an external app uses them.
4. **Upstream patches stay narrow.** Avoid bundling fork-specific product behavior with generic host improvements.
5. **The fork remains syncable.** Prefer additive seams over invasive rewrites.

## Feature Decomposition

### 015 — Extension Host Import Boundary
Define and test the supported import surface for downstream consumers. Importing public event/session contracts must be side-effect-free and limited to Hearsay's core dependencies. Consumer applications own their own optional packages and packaging.

### 016 — Upstream Contribution Workflow
Document and enforce how generic changes are separated, tested, and proposed back to `parkscloud/Hearsay`.

## Non-Goals

- No interview overlay or teleprompter UI infrastructure.
- No vector database or knowledge-store provider.
- No consumer plugin loader/marketplace in this epic.
- No consumer-enabled Hearsay installer/build flavor.
- No requirement that upstream accept any fork change.

## Acceptance Journey

1. Base Hearsay installs/runs with its normal dependencies.
2. A tiny external test program imports the supported transcript-event/session API without starting the Hearsay application shell.
3. No FastEmbed/Postgres/pgvector/LLM or other consumer dependency is required by that import surface.
4. Generic extension-host changes have focused tests containing no interview/RAG fixtures.
5. A candidate upstream patch can be prepared without dragging in consumer-specific code or dependencies.

## Success Metrics

- Public host API imports are side-effect-free.
- Base packaging contains no downstream consumer dependency set.
- Upstream-ready commits are independently cherry-pickable.
- Generic tests use only synthetic transcription/session data.
- No personal or interview-specific data appears in upstream-facing changes.

## Dependencies

Build on Epic 001's generic event/session contracts. Consumer projects may depend on these host capabilities; Hearsay must never depend back on consumers.
