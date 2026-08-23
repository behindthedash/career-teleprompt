## MODIFIED Requirements

### Requirement: Upstream sync is repeatable and non-destructive
The repository SHALL provide a repeatable helper that verifies the canonical `parkscloud/Hearsay` upstream remote, fetches `master`, reports divergence, and applies synchronization only through an explicit merge on a clean expected target branch. The helper SHALL NOT force-push, reset, rebase, or push.

#### Scenario: Developer previews upstream synchronization
- **WHEN** the developer runs the helper without the apply flag
- **THEN** upstream is fetched and divergence is reported without changing branch history

#### Scenario: Developer applies upstream synchronization
- **WHEN** the developer explicitly applies synchronization from a clean `dev` worktree
- **THEN** `upstream/master` is merged with history preserved and any conflicts are surfaced for explicit resolution

### Requirement: Upstream contributions exclude consumer/private material
The repository SHALL provide an automated candidate-range guard that rejects known fork-only paths, transcript artifacts, consumer-specific imports, and credential-like added content before an upstream contribution is submitted.

#### Scenario: Candidate contains only generic Hearsay work
- **WHEN** a candidate branch created from upstream history contains only generic implementation, tests, or documentation
- **THEN** the automated guard succeeds and the developer proceeds to mandatory human diff review

#### Scenario: Candidate includes fork-only or sensitive material
- **WHEN** the candidate range contains blocked planning metadata, downstream product imports, transcript artifacts, or credential-like additions
- **THEN** the guard fails with actionable violations and the candidate is not ready for upstream submission

### Requirement: Contribution rejection does not block local evolution
The documented workflow SHALL keep rejected or fork-only changes on fork branches and SHALL NOT require rewriting shared fork history to resume future upstream synchronization.

#### Scenario: Upstream declines a generic patch
- **WHEN** an upstream contribution is declined
- **THEN** the fork may retain the change and continue future fetch/merge synchronization independently
