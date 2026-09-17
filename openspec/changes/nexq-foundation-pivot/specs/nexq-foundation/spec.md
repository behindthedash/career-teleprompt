## Purpose

Establishes NexQ as the adopted application foundation of Career Teleprompt: a pinned, attributed upstream baseline whose audio, STT, RAG, LLM, and overlay infrastructure is reused rather than rebuilt, with pre-pivot history preserved in one canonical repository.

## ADDED Requirements

### Requirement: Foundation baseline is pinned and documented
The repository SHALL record the exact upstream NexQ commit used as the foundation baseline, its commit date, and its license in committed migration documentation. Build and migration automation SHALL NOT track a moving upstream branch.

#### Scenario: Contributor locates the baseline
- **WHEN** a contributor reads the migration documentation
- **THEN** it names the upstream repository, the exact baseline commit SHA, the commit date, and the MIT license under which the tree was adopted

#### Scenario: Baseline changes only explicitly
- **WHEN** newer upstream NexQ changes are adopted
- **THEN** the recorded baseline SHA is updated in the same reviewable change, and no automation pulls a newer upstream revision on its own

### Requirement: Upstream attribution is preserved
Substantial derived copies and distributions SHALL retain NexQ's MIT copyright and permission notice. Any retained pre-pivot material SHALL keep its applicable license attribution.

#### Scenario: Repository license
- **WHEN** a reader opens the repository license file after the pivot
- **THEN** NexQ's MIT copyright and permission notice is present unaltered

#### Scenario: Installer distribution
- **WHEN** a Windows installer is built from the repository
- **THEN** the distributed material includes the MIT license notice

### Requirement: Pre-pivot history remains recoverable in one canonical repository
The pivot SHALL be performed in the existing repository without rewriting, squashing away, or deleting pre-pivot history. Obsolete runtime files SHALL be removed only by the single foundation-import change so they remain recoverable from history.

#### Scenario: Recovering a pre-pivot file
- **WHEN** a contributor checks out any commit before the foundation import
- **THEN** the Python Hearsay implementation is present exactly as it was before the pivot

#### Scenario: Project identity is a rename, not a new repository
- **WHEN** the project identity becomes Career Teleprompt
- **THEN** the existing repository is renamed in place and links to the old name redirect to it

### Requirement: Single production desktop shell
Career Teleprompt SHALL ship exactly one production desktop application, built on the adopted Tauri/Rust/React foundation with its Node/Rust/Tauri toolchain. A second Python desktop shell, a duplicate RAG/vector store, or a parallel audio-capture implementation SHALL NOT be introduced unless a measured, reproducible capability gap justifies it.

#### Scenario: Continuous integration builds the foundation toolchain
- **WHEN** a pull request targets the integration branch
- **THEN** the required check installs the Node dependencies, runs the JavaScript tests and typecheck, builds the frontend, and checks the Rust crate on Windows, and no Python packaging step is required

#### Scenario: Windows installer is produced from the migrated repository
- **WHEN** the installer or release workflow runs
- **THEN** it builds a Career Teleprompt Windows installer from the adopted foundation and smoke-tests the installed application

### Requirement: Adopted infrastructure changes only against reproducible requirements
NexQ audio capture, STT, RAG, LLM, and overlay code SHALL be treated as adopted infrastructure. A change to it SHALL trace to a reproducible defect, a recorded hardware-acceptance failure, or a Career Teleprompt requirement, never to preference or speculative hardening.

#### Scenario: Capture change cites its evidence
- **WHEN** a change to capture or STT infrastructure is proposed
- **THEN** it references the recorded acceptance-matrix failure or the reproducible defect that motivates it

### Requirement: Baseline validation is recorded before infrastructure is modified
The unmodified foundation SHALL be validated on Windows across the acceptance matrix: default microphone, default speakers/system loopback, Bluetooth output, USB audio, browser playback and meeting-application playback captured as `Them`, local STT, one cloud STT provider, device switching and restart, overlay always-on-top behavior, and an interview scenario with RAG document load. Outcomes SHALL be recorded in migration documentation. Failures become concrete specs; passing areas are not rewritten.

#### Scenario: Matrix item is exercised
- **WHEN** an acceptance-matrix item is tested
- **THEN** its pass/fail outcome, a generic device description, and the date are recorded without personal or machine-identifying detail

#### Scenario: Matrix failure becomes a spec
- **WHEN** an acceptance-matrix item fails
- **THEN** a concrete OpenSpec change describing the failure is created before the affected infrastructure is modified
