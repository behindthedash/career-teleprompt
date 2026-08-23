## 1. Diagnostics domain
- [ ] 1.1 Extract/share content-free live-profile aggregation so offline and in-app reports use the same metric definitions.
- [ ] 1.2 Define deterministic, documented suitability classification over completed live-profile summaries.
- [ ] 1.3 Add an in-memory diagnostic result model that excludes transcript content and audio.

## 2. Hardware and configuration
- [ ] 2.1 Detect whether CPU and supported NVIDIA CUDA test configurations are available using existing hardware primitives where practical.
- [ ] 2.2 Present the recommended CPU (`small.en`/`int8`) and GPU (`turbo`/`float16`) configurations without mutating normal recording settings.
- [ ] 2.3 Handle unavailable/failed GPU inference with actionable UI messaging.

## 3. In-app performance test workflow
- [ ] 3.1 Add a normal application entry point for Transcription Performance diagnostics.
- [ ] 3.2 Start diagnostic sessions with `LIVE_TRANSCRIPTION_PROFILE` and `SessionOutputMode.LIVE_ONLY` without external scripts or private API calls.
- [ ] 3.3 Show effective-audio sample progress and current live health during the run.
- [ ] 3.4 Require at least 3 minutes of effective audio before a test can be reported as complete.
- [ ] 3.5 Support clean cancel/stop, recorder failure, and inference-load failure behavior.

## 4. Results and export
- [ ] 4.1 Display aggregate RTF, p95/max RTF, maximum backlog, healthy percentage, and longest behind streak.
- [ ] 4.2 Display a plain-language Suitable/Marginal/Unsuitable assessment only for completed samples.
- [ ] 4.3 Export content-free text/JSON reports with application, hardware, configuration, cadence, sample, and aggregate metric metadata.
- [ ] 4.4 Verify exported reports contain no transcript text, audio, or transcript artifact paths.

## 5. Verification
- [ ] 5.1 Add synthetic unit tests for aggregation, classification, progress, hardware availability, privacy, and failure cases.
- [ ] 5.2 Run Ruff lint, Ruff format-check, and pytest on Python 3.11 and 3.14 in CI.
- [ ] 5.3 Build the Windows installer and verify the diagnostics workflow is reachable and usable from the packaged application without Git, Python, PowerShell, or repository access.
- [ ] 5.4 Run representative several-minute CPU and NVIDIA GPU tests through the packaged diagnostics UI and record the content-free summaries, satisfying low-latency validation task 4.3.
