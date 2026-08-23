# Epic 002 — Upstream Readiness and Host Import Boundary

## Business Objective

Keep the fork maintainable against `parkscloud/Hearsay` and make generic host capabilities independently consumable and independently reviewable/contributable upstream while downstream applications evolve outside this repository.

## Architectural Principles

1. Generic host capabilities must remain useful without any specific downstream consumer.
2. A downstream Python process must be able to import supported event/session contracts without launching tray UI, opening audio, or loading Whisper.
3. Consumer dependencies stay in consumer repositories.
4. Upstream patches stay narrow and free of downstream product behavior or personal data.
5. The fork remains syncable through additive seams rather than invasive rewrites.

## Capabilities

### Extension Host Import Boundary
Provide a documented side-effect-free Python import surface for transcript event/subscription and session contracts using only Hearsay core dependencies.

### Upstream Contribution Workflow
Define a repeatable fork-sync and contribution discipline that keeps generic host improvements independently reviewable.

## Acceptance Journey

1. Base Hearsay installs/runs with normal dependencies.
2. A tiny external process imports supported host contracts without starting the Hearsay application shell.
3. No retrieval/vector/database/LLM dependency is needed for that import.
4. Generic host tests use only synthetic transcription/session data.
5. A candidate upstream patch can be prepared without downstream consumer code or data.
