## MODIFIED Requirements

### Requirement: Upstream sync is repeatable and non-destructive
Adopting newer commits from upstream NexQ SHALL preserve this repository's history and surface conflicts for explicit resolution rather than force-rewriting shared history. Each adoption SHALL be an explicit, reviewable change that updates the recorded baseline commit.

#### Scenario: Adopting an upstream fix
- **WHEN** a contributor brings a newer upstream NexQ change into the repository
- **THEN** existing commits are untouched, conflicts are resolved in the adopting change, and the documented baseline SHA is updated in that same change

### Requirement: Upstream contributions exclude consumer/private material
A candidate contribution to upstream NexQ SHALL contain only generic implementation, tests, and documentation, and SHALL contain no Career Teleprompt governance files, personal knowledge, credentials, or real transcript content.

#### Scenario: Preparing an upstream branch
- **WHEN** a generic fix is prepared for upstream
- **THEN** the branch contains no OpenSpec artifacts, workflow policy files, or private data

### Requirement: Contribution rejection does not block local evolution
If upstream NexQ declines a generic change, Career Teleprompt SHALL be able to retain it locally, and retaining it SHALL NOT prevent future adoption of upstream changes.

#### Scenario: Declined change retained
- **WHEN** upstream declines a change that Career Teleprompt relies on
- **THEN** the change stays in the repository and later upstream adoptions still merge against it explicitly
