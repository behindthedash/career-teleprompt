## Why

The fork should consume upstream Hearsay improvements while contributing generally useful host changes back without leaking personal data or forcing upstream to review downstream consumer code.

## What Changes

- Document `origin` (fork) and `upstream` remote conventions and sync/rebase workflow.
- Define contribution branch naming and the rule that upstream PRs contain generic host commits only.
- Add a pre-contribution checklist for tests, docs, dependency/import boundaries, and personal-data review.
- Require consumer-specific RAG, knowledge, interview, and teleprompter changes to remain outside upstream-facing branches.
- Track divergence/conflicts without rewriting upstream history.

## Capabilities

### New Capabilities
- `upstream-contribution-workflow`: repeatable fork-sync and generic-contribution process.

## Impact

Documentation/governance only.
