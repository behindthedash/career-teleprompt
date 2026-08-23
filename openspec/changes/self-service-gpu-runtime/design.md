# Design: Self-Service NVIDIA GPU Runtime

## Context

GPU enumeration and GPU inference are different capabilities. `ctranslate2.get_cuda_device_count()` can report a usable NVIDIA device even when the process cannot load `cublas64_12.dll` or cuDNN 9. Hearsay therefore needs an optional runtime layer between hardware detection and actual CUDA inference.

## Decisions

### 1. On-demand runtime, not a larger base installer

The NVIDIA Windows cuBLAS and cuDNN wheels are large. Hearsay keeps the normal installer CPU-capable and downloads GPU support only for users who choose it.

### 2. Official PyPI source with committed trust pins

Each supported NVIDIA package has a committed project name, version, expected Windows wheel SHA-256, and expected archive prefix. At runtime Hearsay queries the version-specific PyPI JSON endpoint, accepts only the expected `py3-none-win_amd64.whl` entry, requires the committed digest to match PyPI metadata, requires an HTTPS `files.pythonhosted.org` URL, and re-hashes the downloaded bytes before extraction.

This prevents a moving `latest` release from silently changing the GPU runtime underneath a shipped Hearsay build.

### 3. Extract only runtime payloads into LOCALAPPDATA

Large machine-specific binaries belong in `%LOCALAPPDATA%`, not roaming application data. Hearsay extracts NVIDIA DLLs plus included license files into a versioned `gpu-runtime` directory. Downloads happen in a staging directory and are promoted only after required DLLs exist and a manifest is written.

### 4. Process-local activation

Hearsay prepends the runtime `bin` directory to the current process `PATH` so child processes inherit it and calls `os.add_dll_directory()` for the Windows restricted DLL search path. It does not edit the user's persistent environment or machine-wide `PATH`.

### 5. System CUDA remains valid

The managed runtime is preferred when installed, but Hearsay does not require it. A user with an already-compatible system CUDA/cuDNN installation can continue to pass GPU preflight without downloading Hearsay-managed GPU support.

### 6. First-run failure must be safe

The setup wizard may recommend CUDA after hardware detection, but it may persist a CUDA configuration only after optional GPU support has been prepared. If runtime setup fails, the wizard switches to the supported CPU `small.en/int8` configuration and prepares that model instead.

### 7. Diagnostics remains the truth gate

After managed runtime installation, the existing isolated GPU preflight still executes one real faster-whisper CUDA inference before the three-minute benchmark begins. Installing DLLs is not itself evidence that GPU inference works.

## Failure handling

- insufficient disk: fail before network download;
- user cancellation: remove staging data and leave any previous valid runtime untouched;
- unexpected PyPI host/metadata: fail closed;
- SHA mismatch: delete the downloaded wheel and fail closed;
- missing required DLL after extraction: do not promote staging;
- first-run GPU setup failure: fall back to CPU;
- upgraded existing install: retain **Install GPU Support** in diagnostics until the current managed runtime is valid.

## Update strategy

GPU runtime versions are intentionally pinned per Hearsay release. Updating cuBLAS/cuDNN requires a normal code/release change that updates version/hash pins and regression coverage. Old Hearsay-managed runtime versions can be cleaned after the replacement has been staged and promoted successfully.
