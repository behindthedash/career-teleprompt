## Purpose

Defines how the fork stays synchronized and produces clean upstream-ready changes.

## ADDED Requirements

### Requirement: Upstream sync is repeatable and non-destructive
#### Scenario: Upstream publishes new commits
- **WHEN** the fork synchronizes
- **THEN** the process preserves upstream history and surfaces conflicts for explicit resolution rather than force-rewriting shared branches

### Requirement: Upstream contributions exclude fork-specific/private material
#### Scenario: Generic transcript API is proposed upstream
- **WHEN** an upstream contribution branch is prepared
- **THEN** it contains only the generic implementation/tests/docs and no personal KB, interview, connection, or real transcript content

### Requirement: Contribution rejection does not block local evolution
#### Scenario: Upstream declines a generic change
- **WHEN** the fork continues development
- **THEN** the change may remain behind a local compatibility boundary without preventing future upstream sync
