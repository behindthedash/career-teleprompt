# Epic: Extension Boundary and Upstream Readiness

**Epic ID:** 003-extension-boundary-upstream-readiness  
**Date:** 2026-08-22  
**Status:** Proposed  
**Product objective:** Keep the interview-copilot fork maintainable and upstream-friendly by isolating generic Hearsay improvements from interview-specific functionality and producing contribution-sized changes that can be proposed back to `parkscloud/Hearsay`.

## Business Objective

The fork should remain easy to rebase on upstream Hearsay while contributing generally useful improvements back to the original project. Interview-specific retrieval, corpus, and cue behavior should not force upstream maintainers to accept niche product code in order to benefit from reusable extension seams, ephemeral live-transcription behavior, or compact UI primitives.

## Why This Epic Exists

A fast prototype can easily modify `HearsayApp` directly until audio, retrieval, UI, and personal configuration become inseparable. That would make upstream contribution difficult and future upgrades expensive.

The base project already has good subsystem boundaries for recording, transcription, output, and UI. The fork should preserve that quality and introduce only the minimum additional generic seams required for optional consumers.

## Product Principle

> **Fork for experimentation; contribute abstractions, not the niche use case.**

## Architectural Principles

### 1. Generic transcript events belong upstream; interview retrieval does not

A reusable event/subscriber boundary for finalized transcription is broadly useful for captions, accessibility, automations, alternate output formats, and integrations. Personal RAG retrieval is fork-specific unless upstream explicitly requests it.

### 2. Extension failures cannot break transcription

Subscribers must be isolated so an exception or slow retrieval consumer cannot block the core pipeline, writer, or live transcript.

### 3. Avoid a premature plugin framework

Start with a small explicit extension/event API. Do not create a plugin marketplace, dynamic package loader, or generalized dependency injection framework before a second real extension requires it.

### 4. Separate upstream-generic commits

Generic refactors must be independently testable and reviewable without requiring the interview corpus, vector DB, or AI provider dependencies.

### 5. Preserve base defaults

Normal Hearsay behavior remains local transcription + markdown output. Fork-specific features are additive and disabled unless selected.

### 6. New heavyweight dependencies stay behind fork-specific boundaries

Vector stores, embedding models, optional LLM SDKs, or retrieval frameworks must not become mandatory imports for the core transcription path.

## Security and Reliability Invariants

- Extension callbacks cannot execute synchronously on the audio capture thread.
- A failing subscriber is logged and isolated.
- Extension queues have bounded/backpressure behavior.
- Session identity prevents stale events from one meeting reaching a later session.
- Optional copilot dependencies do not prevent the base application from launching when copilot features are disabled.
- Public committed files contain no personal resume/project corpus or machine-specific secrets/paths.

## Non-Goals

- Convincing upstream to adopt the interview copilot itself.
- Designing a universal Python plugin ecosystem.
- Rewriting Hearsay around an event-sourcing architecture.
- Moving the application to a different UI framework.
- Changing the base license or ownership model.

## Feature Decomposition

### Feature 1 — Generic Transcript Subscriber API

Extract the Epic 001 transcript event boundary into a small documented API with ordering, session identity, failure isolation, and tests.

**Proposed OpenSpec change:** `012-generic-transcript-subscriber-api`

Potential upstream contribution: yes.

### Feature 2 — Generic Ephemeral Live-Transcription Output Mode

Evaluate whether a no-save/live-only transcription mode can be expressed generically without interview-specific semantics.

**Proposed OpenSpec change:** `013-generic-live-only-session-mode`

Potential upstream contribution: yes, subject to maintainer interest.

### Feature 3 — Compact Always-On-Top Transcript/Cue Window Primitives

Extract only broadly useful UI behavior (topmost/no-focus/position persistence/compact mode) when it can be separated cleanly from RAG cue content.

**Proposed OpenSpec change:** `014-compact-topmost-window-primitives`

Potential upstream contribution: maybe; validate usefulness first.

### Feature 4 — Fork Dependency Isolation and Packaging

Split optional copilot dependencies from core Hearsay dependencies and ensure packaging/build behavior works both with and without copilot extras.

**Proposed OpenSpec change:** `015-copilot-dependency-isolation`

Potential upstream contribution: generally no; fork maintenance concern.

### Feature 5 — Upstream Sync and Contribution Workflow

Document remotes, branch conventions, upstream-sync process, contribution checks, and how to keep generic PRs free of personal/interview-specific material.

**Proposed OpenSpec change:** `016-upstream-contribution-workflow`

Potential upstream contribution: no; fork governance/documentation.

## Existing Components / Reuse Boundaries

- Preserve Hearsay's current queue/thread model.
- Preserve `TranscriptionPipeline` as the producer of finalized transcription results.
- Refactor `_poll_transcripts()` only enough to separate result dispatch from concrete consumers.
- Preserve current writer and live-view consumers as first-class built-in subscribers or equivalent explicit handlers.
- Preserve existing build/release guidance and manual device acceptance tests from upstream project documentation.

## Dependencies and Sequencing

1. Implement the smallest working transcript event seam for Epic 001.
2. Prove it with the interview copilot subscriber.
3. Harden/test the seam generically before proposing upstream.
4. Evaluate ephemeral mode after its fork behavior is proven.
5. Extract UI primitives only when duplication is observable.
6. Keep dependency isolation active throughout all later feature work.

## Success Metrics

- Upstream Hearsay can be merged/rebased without repeated invasive edits to audio/transcription internals.
- Core transcription tests run without installing optional RAG/LLM dependencies.
- Generic transcript subscriber tests contain no interview-specific assumptions.
- An intentionally failing/slow extension does not interrupt ordinary transcription output.
- At least one useful generic change is structured as an upstream-ready PR with narrow scope and documentation.

## Acceptance Journey

```text
upstream Hearsay releases a change
  -> fork syncs/rebases with limited conflicts
    -> ordinary Hearsay tests still pass
      -> copilot tests still pass
        -> generic transcript event change is isolated in a clean branch/commit set
          -> upstream PR can be opened without personal corpus or interview-specific code
            -> fork-specific RAG work continues independently whether upstream accepts it or not
```

## Risks

- **Premature abstraction slows MVP.** Mitigation: prove every seam with a concrete fork use case first.
- **Upstream accepts only part of the refactor.** Mitigation: keep contribution-sized commits and maintain compatibility adapters in the fork.
- **Optional dependencies leak into base startup.** Mitigation: import boundaries, extras, packaging tests.
- **Personal data is accidentally committed.** Mitigation: corpus path outside repo by default, `.gitignore` rules, fixture-only synthetic test data, explicit public-repo guidance.

## Open Questions for Feature Pickup

1. Should built-in writer/live-view consumers be migrated onto the subscriber API, or should the first API run alongside existing dispatch to minimize risk?
2. Is a simple callback registry sufficient, or is a bounded event queue per subscriber warranted immediately?
3. What is the cleanest packaging model for optional copilot dependencies under PyInstaller?
4. Which changes are sufficiently generic to discuss with upstream before implementation versus after proving them in the fork?
5. Should the fork retain the Hearsay name internally or adopt a distinct product/package name while preserving upstream attribution?
