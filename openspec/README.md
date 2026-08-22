# OpenSpec

This repository uses OpenSpec only for changes owned by the Hearsay transcription host.

## Product boundary

Hearsay is the reusable Windows transcription host. It owns audio capture, local transcription, source-tagged transcript events, live-only session behavior, low-latency transcription profiles, extension-host lifecycle, reusable desktop primitives, and upstream-ready hardening.

Hearsay does **not** own interview question detection, resume/project RAG, knowledge-store schemas, interview cue generation, teleprompter behavior, or target-company preparation. Those belong to a separate consumer project.

## Active epics

1. [`001-extension-host-foundation.md`](epics/001-extension-host-foundation.md) — generic transcript events, subscriber API, live-only sessions, and low-latency profiles.
2. [`002-upstream-readiness.md`](epics/002-upstream-readiness.md) — reusable UI primitives, optional dependency boundaries, and contribution discipline.

## Active changes

- `001-transcript-event-extension-boundary`
- `012-generic-transcript-subscriber-api`
- `013-generic-live-only-session-mode`
- `014-compact-topmost-window-primitives`
- `015-copilot-dependency-isolation`
- `016-upstream-contribution-workflow`
- `017-low-latency-live-transcription`

Change numbering intentionally preserves previously published IDs rather than renumbering history.

## Extracted consumer specs

`extractions/interview-copilot/` is a **non-active migration package** for the planned `behindthedash/hearsay-interview-copilot` repository. OpenSpec changes in that package are not Hearsay changes and must not be implemented in this repository.

The package exists only to preserve the already-written specifications until the companion repository is created, at which point its `changes/`, `epics/`, and `config.yaml` should become that repository's root `openspec/` directory.

## Working principles

- Keep the transcript event contract generic and free of interview/RAG metadata.
- Optional consumers must never block audio capture or transcription.
- Preserve ordinary Hearsay behavior unless a host capability explicitly changes it.
- Prefer explicit subscriber registration over dynamic plugin discovery for the first supported API.
- Do not add domain-specific retrieval, personal-knowledge, or interview semantics to Hearsay core.
- Keep generic changes suitable for eventual upstream contribution to `parkscloud/Hearsay`.
