## Purpose

Keeps optional knowledge/copilot dependencies from becoming hard dependencies of core Hearsay.

## ADDED Requirements

### Requirement: Base Hearsay starts without copilot extras
#### Scenario: Only core requirements are installed
- **WHEN** the user launches Hearsay and uses ordinary transcription
- **THEN** startup and normal recording succeed without importing or requiring vector/Postgres/LLM packages

### Requirement: Optional providers fail clearly when unavailable
#### Scenario: pgvector provider is selected without Postgres extras
- **WHEN** the application attempts to initialize that provider
- **THEN** it reports the missing optional dependency and remediation rather than crashing application startup

### Requirement: Packaging makes dependency scope explicit
#### Scenario: Base installer is built
- **WHEN** the standard upstream-compatible build is produced
- **THEN** optional copilot dependencies are not bundled unless that build flavor explicitly includes them
