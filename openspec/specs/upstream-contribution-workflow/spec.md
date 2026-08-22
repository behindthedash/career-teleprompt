## Purpose

Defines how the fork stays synchronized with upstream Hearsay and produces clean upstream-ready generic changes.

## Requirements

### Requirement: Upstream sync is repeatable and non-destructive
Synchronizing new upstream commits SHALL preserve upstream history and surface conflicts for explicit resolution rather than force-rewriting shared history.

### Requirement: Upstream contributions exclude consumer/private material
A candidate upstream branch SHALL contain only generic implementation/tests/docs and SHALL contain no interview-product code, personal knowledge, credentials, or real transcript content.

### Requirement: Contribution rejection does not block local evolution
If upstream declines a generic change, the fork MAY retain it behind a local compatibility boundary without preventing future upstream synchronization.
