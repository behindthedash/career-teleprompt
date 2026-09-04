## Purpose

Lets a normal user on a supported NVIDIA GPU get real CUDA acceleration for faster-whisper from within the installed app, without Git, Python, PowerShell, CUDA Toolkit installation, or manual environment-variable editing.

## Requirements

### Requirement: Hearsay SHALL offer normal-user NVIDIA runtime setup
When a supported NVIDIA GPU is detected, Hearsay SHALL provide an installed-application workflow for preparing the CUDA runtime required by faster-whisper without requiring Git, Python, PowerShell, CUDA Toolkit installation, or manual environment-variable editing.

#### Scenario: Existing user needs GPU runtime
- **GIVEN** a compatible NVIDIA GPU is detected
- **AND** Hearsay-managed GPU runtime files are not installed
- **WHEN** the user opens transcription performance diagnostics
- **THEN** Hearsay SHALL offer an **Install GPU Support** action
- **AND** SHALL disclose the approximate download/disk requirement before installation begins

#### Scenario: Managed runtime is already installed
- **WHEN** the diagnostics screen detects a valid Hearsay-managed GPU runtime
- **THEN** the GPU support action SHALL indicate that support is installed
- **AND** SHALL NOT redownload the runtime unnecessarily

### Requirement: Optional NVIDIA payloads SHALL be verified before installation
Hearsay SHALL download only pinned official NVIDIA Windows runtime wheels and SHALL fail closed when source metadata, host, or downloaded bytes do not match the version/hash trust pins committed with the application.

#### Scenario: Pinned wheel is downloaded
- **WHEN** Hearsay resolves a supported NVIDIA runtime package
- **THEN** it SHALL query the version-specific PyPI metadata endpoint
- **AND** SHALL accept only the expected Windows x86-64 wheel from HTTPS `files.pythonhosted.org`
- **AND** SHALL require the PyPI SHA-256 metadata to match Hearsay's committed digest
- **AND** SHALL independently SHA-256 hash the downloaded bytes before extraction

#### Scenario: Download integrity fails
- **WHEN** a downloaded wheel does not match its pinned SHA-256 digest
- **THEN** Hearsay SHALL delete/reject that staged payload
- **AND** SHALL NOT promote it as installed GPU support

### Requirement: GPU runtime installation SHALL be app-local and atomic
Hearsay SHALL store optional GPU runtime files under Hearsay-owned local application data and SHALL NOT make persistent machine-wide `PATH` changes.

#### Scenario: Runtime installation succeeds
- **WHEN** all required pinned payloads have been verified and extracted
- **THEN** Hearsay SHALL verify required cuBLAS/cuDNN DLLs are present
- **AND** SHALL write an installation manifest
- **AND** SHALL promote the staging directory to the active versioned runtime directory

#### Scenario: Runtime installation is cancelled or fails
- **WHEN** the user cancels setup or an installation step fails
- **THEN** Hearsay SHALL clean the partial staging directory
- **AND** SHALL NOT treat the incomplete payload as installed

#### Scenario: Runtime is activated
- **GIVEN** a valid Hearsay-managed runtime exists
- **WHEN** Hearsay prepares CUDA inference
- **THEN** Hearsay SHALL add the managed runtime directory to the current process DLL search path
- **AND** SHALL make it available to Hearsay child processes
- **AND** SHALL NOT persistently modify the user's or machine's `PATH`

### Requirement: Existing system CUDA installations SHALL remain supported
Hearsay SHALL prefer its managed runtime when available but SHALL NOT require it when a compatible system-wide CUDA/cuDNN runtime already permits real GPU inference.

#### Scenario: Managed runtime is absent but system runtime works
- **WHEN** isolated GPU preflight succeeds using the machine's existing runtime
- **THEN** Hearsay SHALL allow the GPU performance test to proceed without requiring the optional managed runtime download

### Requirement: First-run setup SHALL never persist a known-broken CUDA configuration
The setup wizard SHALL prepare optional GPU runtime support before completing a GPU-recommended setup and SHALL fall back to a supported CPU configuration when optional GPU support cannot be prepared.

#### Scenario: First-run GPU setup succeeds
- **GIVEN** hardware detection recommends CUDA
- **WHEN** optional GPU runtime installation succeeds
- **THEN** the wizard SHALL continue preparing the recommended GPU Whisper model/configuration

#### Scenario: First-run GPU setup fails
- **GIVEN** hardware detection recommends CUDA
- **WHEN** optional GPU runtime installation fails
- **THEN** the wizard SHALL change the pending configuration to CPU `small.en/int8`
- **AND** SHALL prepare the CPU model
- **AND** SHALL explain that GPU support can be retried later

### Requirement: Installed GPU support SHALL still be proven by real inference
Runtime installation SHALL NOT by itself classify GPU support as operational for performance validation.

#### Scenario: User starts the GPU diagnostic after runtime installation
- **WHEN** the user starts the NVIDIA GPU test
- **THEN** Hearsay SHALL execute the existing isolated real-CUDA inference preflight before live capture
- **AND** SHALL start the three-minute benchmark only if preflight succeeds
