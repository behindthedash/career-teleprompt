## Why

The fork now contains reusable host seams that may be worth contributing to `parkscloud/Hearsay`, but there is no executable discipline for safely syncing upstream or proving that a candidate patch is free of fork-only planning, downstream product dependencies, credentials, or transcript artifacts.

## What Changes

- Add a non-destructive upstream sync helper that fetches `parkscloud/Hearsay` and optionally merges `upstream/master` into the current `dev` branch without force, reset, rebase, or push operations.
- Add an upstream-candidate validator that inspects a Git range for fork-only paths, consumer-specific imports, transcript artifacts, and credential-like added content.
- Document the branch/cherry-pick workflow for preparing narrow upstream candidates and the manual review that remains required.
- Add synthetic automated tests for safe sync and candidate rejection behavior.

## Scope

This is repository-maintenance tooling only. It does not change audio capture, transcription, session behavior, public host APIs, Interview Copilot behavior, or packaging dependencies.
