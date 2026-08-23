# NexQ Foundation Baseline

Career Teleprompt adopts NexQ as its application foundation from the following pinned upstream baseline:

- Upstream repository: `naxhq/NexQ`
- Baseline commit: `1ce1524c122df509f231c521a07ada95bfde2d88`
- Upstream commit date: 2026-06-28
- Upstream commit message: `fix(stt): restore transcription in two-window overlay architecture` (merge PR #3)
- License: MIT

## Provenance

The NexQ baseline supplies the active desktop application architecture after the migration: Tauri/Rust backend, React/TypeScript frontend, Windows audio capture, STT providers, meeting/session behavior, RAG/context pipeline, LLM integration, and overlay.

Career Teleprompt-specific behavior is layered on top of this baseline. The prior Python Hearsay implementation remains available in repository history and pre-pivot commits but is not the runtime architecture after the foundation-import change.

## Upstream policy

NexQ is treated as an upstream source of platform improvements, not as an authority that must be mirrored blindly. Upstream changes should be reviewed and intentionally integrated against Career Teleprompt requirements.

The pinned baseline must be updated explicitly when upstream changes are adopted. Do not silently track a moving `main` branch in build or migration automation.

## Attribution

NexQ's MIT copyright/license notice must remain present in substantial derived copies and distributions. Any retained material from the former Hearsay foundation must continue to respect its applicable license/attribution requirements.
