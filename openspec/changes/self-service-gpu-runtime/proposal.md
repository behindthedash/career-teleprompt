# Change: Self-Service NVIDIA GPU Runtime

## Why

Hearsay can detect a supported NVIDIA GPU and recommend CUDA inference, but CTranslate2/faster-whisper on Windows also requires compatible CUDA 12 cuBLAS and cuDNN 9 runtime libraries. The upstream application never installed or validated those runtime components, so a normal installed-app user could be configured for CUDA even though GPU inference could not execute.

A desktop application must not require users to discover CUDA developer prerequisites, install toolkits manually, edit `PATH`, or troubleshoot missing DLLs. GPU acceleration should either work through a normal application workflow or Hearsay should fall back to CPU cleanly.

## What Changes

- Add an explicit **Install GPU Support** workflow for compatible NVIDIA systems.
- Keep NVIDIA's large proprietary runtime outside the base installer and download it only after user opt-in.
- Download pinned official NVIDIA Windows wheels directly from PyPI over HTTPS.
- Verify PyPI metadata, expected host, and pinned SHA-256 before installing any payload.
- Extract runtime DLLs and included license files into Hearsay-owned `%LOCALAPPDATA%` storage.
- Activate the Hearsay runtime only for Hearsay and its child processes; do not mutate machine-wide `PATH`.
- Reuse the runtime automatically for ordinary CUDA transcription and isolated diagnostics preflight.
- Integrate GPU runtime preparation into first-run setup when GPU inference is recommended.
- Fall back to a known-good CPU configuration when optional GPU setup fails.
- Preserve support for users who already have a compatible system-wide CUDA/cuDNN runtime.

## Non-Goals

- Do not bundle NVIDIA's runtime into every Hearsay installer.
- Do not install the CUDA Toolkit or development headers.
- Do not make machine-wide environment-variable changes.
- Do not silently download proprietary NVIDIA components without a user-visible action/setup disclosure.
- Do not mark the real NVIDIA hardware performance validation complete until a representative packaged GPU benchmark succeeds.

## Impact

### User experience

Existing users with a compatible GPU can install GPU support from **Settings → Performance Test...** without Git, Python, PowerShell, CUDA Toolkit installers, or manual `PATH` changes. Fresh installs prepare GPU support during the setup wizard or fall back to CPU if that optional step cannot complete.

### Distribution

The normal installer remains small. The optional NVIDIA runtime currently requires approximately 1.3 GB of network download and several GB of temporary free disk space.

### Security and trust

Hearsay accepts only pinned Windows wheels from `files.pythonhosted.org` whose SHA-256 digests match the values committed with the application. Partial/cancelled installs remain staged and are cleaned rather than promoted as valid runtimes.

### Licensing

NVIDIA runtime components remain subject to NVIDIA's software license. Hearsay downloads the official packages on demand and preserves included license files alongside the local runtime.
