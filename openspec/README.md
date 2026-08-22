# OpenSpec

This directory is the spec-driven development registry for the Hearsay interview-copilot fork and remains at the repository root so the OpenSpec CLI can discover it normally.

All OpenSpec planning artifacts live under `openspec/`:

- `openspec/epics/` contains durable product/architecture epics.
- `openspec/addenda/` contains durable roadmap/architecture amendments discovered during feature expansion.
- `openspec/changes/<change-id>/proposal.md` captures the intent and scope for an implementation change.
- `openspec/changes/<change-id>/design.md` captures technical design and tradeoffs when needed.
- `openspec/changes/<change-id>/tasks.md` captures executable implementation work.
- `openspec/changes/<change-id>/specs/<capability>/spec.md` contains capability requirements/deltas.
- Completed changes are archived under `openspec/changes/archive/` after implementation and validation.
- `openspec/config.yaml` contains project context and artifact rules.

There is intentionally no separate `docs/specs/` registry. Epics, addenda, configuration, and change artifacts are kept together under the root OpenSpec project directory.

## Active roadmap

1. [`001-live-interview-copilot.md`](epics/001-live-interview-copilot.md) — MVP: live remote speech → local transcription → retrieval → concise interview cues.
2. [`002-speech-following-teleprompter.md`](epics/002-speech-following-teleprompter.md) — Optional speech-aware teleprompter driven by the local speaker's microphone transcript.
3. [`003-extension-boundary-upstream-readiness.md`](epics/003-extension-boundary-upstream-readiness.md) — Refactor generic extension seams so useful pieces can be proposed upstream without coupling Hearsay to the interview-specific product.

## Working principles

- Preserve Hearsay's local-first audio/transcription behavior.
- Never require persistent recording of interview audio for the copilot workflow.
- Treat retrieved project/resume material as user-owned local knowledge.
- Prefer retrieval and compact cues over generating long scripted answers.
- Keep upstream-generic changes separable from interview-specific functionality.
- Implement each OpenSpec change as the smallest independently testable slice that advances an epic acceptance journey.
