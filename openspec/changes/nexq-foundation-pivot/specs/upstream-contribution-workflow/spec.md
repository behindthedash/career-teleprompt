## REMOVED Requirements

### Requirement: Upstream sync is repeatable and non-destructive
**Reason**: The `parkscloud/Hearsay` upstream and its fetch/merge helper no longer apply; the NexQ foundation import replaced the runtime this helper targeted.
**Migration**: Replaced by "NexQ upstream sync is repeatable and non-destructive" below, which targets NexQ instead of Hearsay.

### Requirement: Upstream contributions exclude consumer/private material
**Reason**: The automated candidate-range guard was scoped to Hearsay-specific fork-only paths that no longer exist after the foundation import.
**Migration**: Replaced by "NexQ upstream contributions exclude consumer/private material" below, scoped to Career Teleprompt's own governance/private material against a NexQ candidate branch.

### Requirement: Contribution rejection does not block local evolution
**Reason**: Described local evolution in terms of the retired fetch/merge helper's branch model.
**Migration**: Replaced by "NexQ contribution rejection does not block local evolution" below, restated for NexQ adoption.

## ADDED Requirements

### Requirement: NexQ upstream sync is repeatable and non-destructive
Adopting newer commits from upstream NexQ SHALL preserve this repository's history and surface conflicts for explicit resolution rather than force-rewriting shared history. Each adoption SHALL be an explicit, reviewable change that updates the recorded baseline commit.

#### Scenario: Adopting an upstream fix
- **WHEN** a contributor brings a newer upstream NexQ change into the repository
- **THEN** existing commits are untouched, conflicts are resolved in the adopting change, and the documented baseline SHA is updated in that same change

### Requirement: NexQ upstream contributions exclude consumer/private material
A candidate contribution to upstream NexQ SHALL contain only generic implementation, tests, and documentation, and SHALL contain no Career Teleprompt governance files, personal knowledge, credentials, or real transcript content.

#### Scenario: Preparing an upstream branch
- **WHEN** a generic fix is prepared for upstream
- **THEN** the branch contains no OpenSpec artifacts, workflow policy files, or private data

### Requirement: NexQ contribution rejection does not block local evolution
If upstream NexQ declines a generic change, Career Teleprompt SHALL be able to retain it locally, and retaining it SHALL NOT prevent future adoption of upstream changes.

#### Scenario: Declined change retained
- **WHEN** upstream declines a change that Career Teleprompt relies on
- **THEN** the change stays in the repository and later upstream adoptions still merge against it explicitly
