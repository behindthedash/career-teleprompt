# Epic 003 — Live Performance Diagnostics

## Business Objective

Make Hearsay's low-latency transcription validation usable by an ordinary Windows user from the installed application, eliminating developer-only setup as a prerequisite for determining whether local CPU or NVIDIA GPU hardware can sustain live transcription.

## Architectural Principles

1. **The installed app is the product boundary.** A supported validation workflow must not require Git, Python, PowerShell, repository source, or temporary launcher scripts.
2. **Reuse runtime truth.** Diagnostics aggregate the same `TranscriptionMetrics` and live-profile health semantics used during transcription.
3. **Diagnostics stay generic.** The feature measures local transcription performance only; downstream interview, retrieval, LLM, and teleprompter behavior remains outside Hearsay.
4. **Privacy remains local-first.** Diagnostic sessions do not persist audio or transcript artifacts, and exported reports contain performance/hardware metadata only.
5. **Real hardware remains the final gate.** Synthetic tests protect logic, but CPU/GPU suitability is validated through packaged-app runs on representative Windows hardware.

## Capabilities

### In-App Transcription Performance Test
Expose a normal UI workflow that can run the existing 4s/1s live transcription profile in a live-only session using supported CPU or NVIDIA GPU configurations.

### Hardware-Aware Test Configuration
Detect supported local inference hardware and offer only valid test configurations, including the recommended CPU and NVIDIA GPU model/compute combinations.

### Human-Readable Performance Result
Aggregate existing RTF/backlog/health observations, require a meaningful effective-audio sample, and present both detailed metrics and a deterministic suitability assessment.

### Content-Free Diagnostics Export
Allow an explicit user export of text/JSON performance results that includes relevant hardware and configuration metadata but excludes transcript content and captured audio.

## Acceptance Journey

1. A user installs Hearsay and opens Transcription Performance diagnostics without any development tooling.
2. Hearsay identifies the available CPU and supported NVIDIA GPU test options.
3. The user starts a test and Hearsay runs the existing 4s/1s live profile without saving a transcript.
4. The UI shows effective-audio progress and current live health while the user provides representative speech.
5. Hearsay does not characterize the test as complete until the required effective-audio sample is met.
6. A completed run shows aggregate metrics and a deterministic Suitable/Marginal/Unsuitable assessment.
7. The user can export a content-free report locally.
8. Representative packaged-app CPU and NVIDIA GPU runs provide the evidence needed to close the remaining low-latency hardware-validation task.
