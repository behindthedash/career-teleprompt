## 1. Safe upstream synchronization
- [x] 1.1 Add a dependency-free helper that verifies/configures the canonical upstream remote and fetches `master`.
- [x] 1.2 Report fork/upstream divergence before applying changes.
- [x] 1.3 Require a clean worktree and expected target branch before an explicit non-fast-forward merge.
- [x] 1.4 Ensure the helper performs no push, force, reset, or rebase operations.

## 2. Candidate contribution guard
- [x] 2.1 Validate a candidate Git range for fork-only paths and transcript artifacts.
- [x] 2.2 Reject downstream consumer-specific imports and credential-like added content.
- [x] 2.3 Provide actionable text and JSON output for failures.

## 3. Documentation
- [x] 3.1 Document fetch/merge synchronization and conflict handling.
- [x] 3.2 Document creating candidate branches from `upstream/master` and cherry-picking only generic commits.
- [x] 3.3 Document mandatory human privacy/product-boundary review before opening an upstream PR.

## 4. Tests
- [x] 4.1 Add synthetic Git-repository tests for dry-run/apply sync behavior and safety refusals.
- [x] 4.2 Add candidate-validator tests for allowed generic patches and blocked fork/private/consumer content.
- [x] 4.3 Run repository Ruff and pytest quality gates on Python 3.11 and 3.14 in CI.
