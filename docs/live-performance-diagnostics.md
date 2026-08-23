# Live Transcription Performance Diagnostics

Hearsay includes an installed-app performance test for checking whether the current Windows PC can sustain the 4-second live transcription profile. The workflow is intentionally usable without Git, Python, PowerShell, a repository checkout, or an external launcher.

## Open the test

1. Open **Hearsay Settings** from the tray icon.
2. Select **Performance Test...**.
3. Choose the audio source that will carry representative speech.
4. Run the CPU test and, when available, the NVIDIA GPU test.

Diagnostic sessions always use:

- the `live` transcription profile: 4-second chunks with 1-second overlap;
- live-only output: no Markdown transcript is created;
- the selected diagnostic inference configuration without changing normal Hearsay settings.

The supported diagnostic configurations are:

| Test | Model | Device | Compute |
| --- | --- | --- | --- |
| CPU | `small.en` | `cpu` | `int8` |
| NVIDIA GPU | `turbo` | `cuda` | `float16` |

The GPU test is disabled when supported CUDA inference is not detected. When GPU VRAM is known and below the approximately 6 GB required by `turbo`, Hearsay explains why that test is unavailable rather than presenting a broken button. A CUDA/model-load failure is also reported as a failed test and never as a completed benchmark.

## Optional NVIDIA GPU support

Seeing an NVIDIA GPU is not sufficient to run faster-whisper on CUDA. Current CTranslate2/faster-whisper builds also need compatible CUDA 12 cuBLAS and cuDNN 9 runtime libraries.

Hearsay keeps these large proprietary NVIDIA components out of the normal installer. When a compatible NVIDIA GPU is detected, **Performance Test** offers **Install GPU Support**. The normal-user flow:

1. explains that the optional download is approximately 1.3 GB and needs about 4 GB of temporary free disk space;
2. downloads pinned NVIDIA Windows runtime wheels directly from PyPI over HTTPS;
3. accepts only `files.pythonhosted.org` wheel downloads whose PyPI metadata matches Hearsay's pinned SHA-256 digests;
4. extracts only the NVIDIA runtime DLLs and included license files into `%LOCALAPPDATA%\Hearsay\gpu-runtime`;
5. activates that directory only for Hearsay and Hearsay child processes rather than editing the machine-wide `PATH`;
6. reruns the isolated real-CUDA preflight before live capture starts.

The first-run setup wizard uses the same installer when it recommends GPU transcription. If optional GPU support cannot be prepared, first-run setup falls back to the supported CPU configuration instead of saving a broken CUDA configuration. GPU support can then be retried later through **Settings → Performance Test...**.

The currently pinned runtime packages are:

| NVIDIA package | Version |
| --- | --- |
| `nvidia-cublas-cu12` | `12.9.2.10` |
| `nvidia-cudnn-cu12` | `9.24.0.43` |

These packages remain subject to NVIDIA's software license. Hearsay does not silently download them; installation begins only after the user chooses the GPU-support action (or proceeds through first-run setup after being told that the optional GPU runtime will be prepared).

A compatible system-wide CUDA/cuDNN installation can still satisfy preflight without the Hearsay-managed runtime.

## Sample progress

A completed test requires at least **3 minutes of effective captured audio**. Wall-clock time and silence do not satisfy the sample target by themselves.

During the run Hearsay displays:

- effective-audio progress toward the target;
- the latest existing live-profile health classification;
- latest realtime factor (RTF);
- latest transcription backlog.

Before the target is met, stopping/cancelling the run produces an incomplete result and no suitability assessment. Once the target is met, the button changes to **Complete Test**.

## Result metrics

The in-app workflow and `scripts/summarize_live_profile.py` share the same aggregation implementation. A result includes:

- effective audio duration;
- observation count;
- aggregate RTF;
- median RTF;
- p95 RTF;
- maximum RTF;
- maximum queue depth;
- healthy and behind observation counts;
- healthy percentage;
- longest consecutive behind streak.

The per-window `healthy` / `behind` values continue to come from `LIVE_TRANSCRIPTION_PROFILE`; diagnostics do not change the runtime thresholds.

## Suitability rules

Suitability is assigned only after the 3-minute sample target is met.

**Unsuitable** is returned when any of these indicate sustained inability to keep pace:

- aggregate RTF is greater than `1.0x`;
- fewer than 70% of observations are healthy;
- maximum queue depth reaches 4 or more;
- five or more consecutive observations are behind.

**Marginal** is returned when the run is not Unsuitable but any of these indicate limited headroom:

- p95 RTF is greater than `1.0x`;
- fewer than 90% of observations are healthy;
- maximum queue depth is greater than the live-profile healthy limit of 1;
- two or more consecutive observations are behind.

A completed run that meets none of those conditions is **Suitable**.

These aggregate categories are a user-facing summary only. They do not modify the live profile's underlying per-window health definition.

## Privacy and export

The diagnostic runner does not create a transcript writer, publish transcript events, or retain an audio artifact. Transcription queue payloads are discarded as the performance observations arrive.

The user may explicitly export either text or JSON. Reports contain only:

- Hearsay version;
- OS, CPU, and available NVIDIA GPU metadata;
- diagnostic model/device/compute configuration;
- profile cadence;
- sample duration and observation count;
- aggregate performance metrics;
- test status and suitability result.

Reports do not contain transcript text, captured audio, or transcript artifact paths. Hearsay does not automatically upload diagnostic results.

## Final hardware validation

The CPU half of the representative hardware matrix has been recorded as Marginal. The NVIDIA GPU half remains open until the packaged application completes at least three minutes of effective audio after a successful CUDA preflight. A missing-runtime/preflight failure is useful product evidence but does not count as the required GPU performance sample.
