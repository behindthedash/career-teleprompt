## 1. Runtime manager
- [x] 1.1 Store optional GPU runtime components under Hearsay-owned local application data.
- [x] 1.2 Pin supported NVIDIA cuBLAS/cuDNN package versions and Windows wheel SHA-256 digests.
- [x] 1.3 Resolve only version-specific PyPI metadata and approved HTTPS wheel hosts.
- [x] 1.4 Stream downloads with progress/cancellation and verify SHA-256 before extraction.
- [x] 1.5 Stage extraction atomically, preserve included license files, and reject incomplete runtimes.
- [x] 1.6 Activate the managed DLL directory for Hearsay/current child processes without persistent PATH changes.

## 2. Existing-user workflow
- [x] 2.1 Add Install GPU Support to the installed Performance Test UI when a compatible NVIDIA GPU is detected.
- [x] 2.2 Disclose approximate download size, temporary disk requirement, source, and NVIDIA licensing before user opt-in.
- [x] 2.3 Support progress, cancellation, retry, and successful installed state without developer tooling.
- [x] 2.4 Update missing-runtime preflight failures to point to the in-app setup action.

## 3. First-run workflow
- [x] 3.1 Explain the optional NVIDIA runtime download when hardware detection recommends GPU acceleration.
- [x] 3.2 Prepare the GPU runtime before the recommended Whisper GPU model.
- [x] 3.3 Fall back to CPU small.en/int8 when optional GPU runtime setup fails.

## 4. Regression coverage
- [x] 4.1 Test successful verified runtime materialization with synthetic wheels.
- [x] 4.2 Test corrupt-download rejection and unexpected-host rejection.
- [x] 4.3 Test cancellation before network access and cleanup behavior.
- [x] 4.4 Keep frozen diagnostics smoke coverage aware of the optional runtime installer.

## 5. Verification
- [x] 5.1 Run Ruff lint, Ruff format-check, and pytest on Windows Python 3.11 and 3.14. (CI run #75 passed both matrix legs.)
- [x] 5.2 Build the frozen Windows app and installer and pass packaged diagnostics smoke. (CI run #75 passed the frozen diagnostics smoke, built `HearsaySetup.exe`, and uploaded the installer artifact.)
- [x] 5.3 Install GPU Support through packaged Hearsay on representative NVIDIA hardware without manual CUDA/PATH setup. (Validated with packaged Hearsay 1.1.9 on an NVIDIA GeForce RTX 4060 Laptop GPU; the Hearsay-managed runtime enabled the GPU test without manual CUDA or PATH configuration.)
- [x] 5.4 Pass isolated CUDA preflight and complete the >=3-minute NVIDIA GPU performance sample required by live-performance-diagnostics 5.4 / low-latency-transcription-profile 4.3. (Hearsay 1.1.9: 3.65 min, 55 observations, aggregate/median/p95/max RTF 0.24x/0.25x/0.27x/0.33x, backlog 0, 55/55 healthy, Suitable.)
