## Purpose

Lets an installed Hearsay user validate, from inside the app, whether their machine can sustain Hearsay's live transcription profile — without needing repository access, Git, Python, PowerShell, or external launcher scripts.

## Requirements

### Requirement: In-app live transcription performance testing
Hearsay SHALL provide a normal installed-application workflow for evaluating whether the local machine can sustain Hearsay's live transcription profile without requiring repository access, Git, Python, PowerShell, or external launcher scripts.

#### Scenario: User starts a CPU performance test
- **WHEN** the user opens transcription performance diagnostics and starts the supported CPU test
- **THEN** Hearsay SHALL run a diagnostic session using the live transcription profile and live-only output mode
- **AND** SHALL use the supported CPU model/compute configuration without changing the user's ordinary recording configuration

#### Scenario: User starts a supported NVIDIA GPU performance test
- **GIVEN** supported NVIDIA CUDA inference is available
- **WHEN** the user starts the GPU performance test
- **THEN** Hearsay SHALL run a diagnostic session using the live transcription profile and live-only output mode
- **AND** SHALL use the supported GPU model/compute configuration without changing the user's ordinary recording configuration

#### Scenario: GPU inference is unavailable
- **GIVEN** supported NVIDIA CUDA inference is not available
- **WHEN** the diagnostics screen is shown
- **THEN** Hearsay SHALL not present the GPU test as runnable
- **AND** SHALL explain that the GPU configuration is unavailable

### Requirement: Diagnostics SHALL reuse live-profile runtime observations
The diagnostics workflow SHALL aggregate the existing live-profile `TranscriptionMetrics` observations and SHALL NOT create a conflicting realtime-factor, queue-depth, or per-window health definition.

#### Scenario: Diagnostic metrics are collected
- **WHEN** a diagnostic transcription window completes
- **THEN** its effective audio duration, processing elapsed time/realtime factor, queue depth, and existing healthy/behind classification SHALL contribute to the diagnostic result

#### Scenario: Offline and in-app aggregation are compared
- **WHEN** the same observation set is summarized through the in-app diagnostics workflow and the offline profiling utility
- **THEN** both SHALL use the same aggregate metric definitions

### Requirement: Completed tests SHALL require a meaningful effective-audio sample
Hearsay SHALL require at least 3 minutes of effective audio by default before a diagnostic run can be characterized as a completed performance test.

#### Scenario: Sample target is not met
- **WHEN** fewer than 3 minutes of effective audio have been observed
- **THEN** the diagnostics UI SHALL show the test as incomplete
- **AND** SHALL NOT assign a Suitable, Marginal, or Unsuitable result

#### Scenario: Sample target is met
- **WHEN** at least 3 minutes of effective audio have been observed
- **THEN** the diagnostics UI SHALL indicate that the sample target has been met
- **AND** SHALL allow the run to be completed and classified

### Requirement: Diagnostics SHALL present understandable performance results
A completed diagnostic result SHALL present content-free aggregate performance information and a deterministic plain-language suitability assessment.

#### Scenario: Completed result is displayed
- **WHEN** a diagnostic run completes after meeting the sample target
- **THEN** the result SHALL include at least effective audio duration, observation count, aggregate RTF, median RTF, p95 RTF, maximum RTF, maximum queue depth, healthy/behind counts, healthy percentage, and longest consecutive behind streak
- **AND** SHALL include a deterministic Suitable, Marginal, or Unsuitable assessment

#### Scenario: Suitability classification is implemented
- **WHEN** aggregate suitability rules are defined
- **THEN** the rules SHALL be explicit, documented, and covered by automated tests
- **AND** SHALL NOT alter the live profile's existing per-window health thresholds

### Requirement: Diagnostic sessions SHALL be privacy-preserving
The performance-test workflow SHALL process speech locally, SHALL NOT persist diagnostic-session audio or transcript artifacts, and SHALL keep exported diagnostic reports free of transcript content.

#### Scenario: Diagnostic session runs
- **WHEN** a performance test is active
- **THEN** the session SHALL use live-only output mode
- **AND** Hearsay SHALL NOT create a saved transcript artifact for that diagnostic session

#### Scenario: Diagnostic report is exported
- **WHEN** the user explicitly exports a text or JSON diagnostic report
- **THEN** the report MAY contain application version, OS/CPU metadata, NVIDIA GPU metadata when applicable, model/device/compute configuration, profile cadence, sample information, aggregate metrics, and suitability result
- **AND** SHALL NOT contain transcript text, captured audio, or transcript artifact paths

#### Scenario: No export is requested
- **WHEN** a diagnostic run completes and the user does not export it
- **THEN** Hearsay SHALL NOT automatically upload or transmit the diagnostic result

### Requirement: Diagnostics SHALL handle interruption and failures without misleading results
The workflow SHALL distinguish completed measurements from cancelled, insufficient, or failed runs.

#### Scenario: User cancels early
- **WHEN** the user cancels before the effective-audio sample target is met
- **THEN** Hearsay SHALL stop the diagnostic session cleanly
- **AND** SHALL show the run as incomplete rather than assigning a suitability result

#### Scenario: Inference configuration fails to load
- **WHEN** the selected CPU or GPU inference configuration cannot be loaded
- **THEN** Hearsay SHALL end the diagnostic run cleanly
- **AND** SHALL display an actionable configuration failure
- **AND** SHALL NOT report a completed performance result

#### Scenario: Recorder or transcription pipeline fails
- **WHEN** the recorder or transcription pipeline fails during a diagnostic run
- **THEN** Hearsay SHALL surface the failure using the application's recording failure behavior
- **AND** SHALL NOT report a completed performance result

### Requirement: Packaged application SHALL expose the diagnostics workflow
The Windows packaged application SHALL include and expose the performance diagnostics capability through normal UI without development tooling.

#### Scenario: Installed user performs validation
- **GIVEN** Hearsay was installed from its Windows installer
- **WHEN** the user opens the diagnostics workflow
- **THEN** the user SHALL be able to start, monitor, complete, and export a supported performance test without installing Git or Python and without opening PowerShell or downloading repository source
