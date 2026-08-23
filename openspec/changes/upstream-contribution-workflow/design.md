## Decisions

### D1. Sync uses fetch plus merge, never history rewriting
The helper configures/verifies an `upstream` remote for `parkscloud/Hearsay`, fetches `master`, reports divergence, and only merges when explicitly invoked with `--apply`. It refuses dirty worktrees and an unexpected current branch. It never pushes, force-pushes, resets, or rebases.

### D2. Upstream candidates start from upstream history
A contribution branch should be created from `upstream/master`, then receive only the generic fork commits intended for upstream (typically by cherry-pick). This prevents the full fork history and OpenSpec/worktrail metadata from leaking into a candidate patch.

### D3. Automated guardrails are conservative, not a substitute for review
The candidate validator rejects known fork-only paths, downstream-consumer path markers/imports, transcript artifacts, and credential-like added lines. A human must still review the final diff before submission because semantic privacy and product-boundary mistakes cannot be perfectly detected by regexes.

### D4. Tooling remains dependency-free
Both scripts use only the Python standard library plus the Git CLI already required by the repository workflow. No downstream consumer package is added to Hearsay.
