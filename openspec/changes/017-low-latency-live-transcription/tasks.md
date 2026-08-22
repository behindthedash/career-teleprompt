## 1. Session transcription profiles

- [ ] 1.1 Add immutable `normal` and `live` transcription profiles with window duration, overlap duration, and backlog-health thresholds; normal must retain the current 30s/1s behavior and live starts at 4s/1s. File: `src/hearsay/transcription/profile.py` or equivalent session module.
- [ ] 1.2 Thread the selected profile through Hearsay recording startup without changing existing normal call sites. File: `src/hearsay/app.py`.

## 2. Recorder parameterization

- [ ] 2.1 Add instance-level window/overlap arguments to `AudioRecorder`, defaulting to current constants; derive each `_SourceBuffer` overlap from the instance profile. File: `src/hearsay/audio/recorder.py`.
- [ ] 2.2 Make `_capture_windows()` use the instance duration while preserving 0.5s stop responsiveness, silence monitoring, stream-death handling, ordered chunks, and final partial-window flush. File: `src/hearsay/audio/recorder.py`.

## 3. Throughput/backlog health

- [ ] 3.1 Extend pipeline diagnostics with processing elapsed time, approximate audio duration/real-time factor, and queue depth without logging additional transcript content. File: `src/hearsay/transcription/pipeline.py`.
- [ ] 3.2 Add sustained healthy/behind state for live sessions and surface it through app/session status before hard queue capacity is reached. Files: `src/hearsay/app.py`, copilot session integration as available.
- [ ] 3.3 Make live-profile queue capacity/threshold explicit and bounded while leaving normal queue behavior unchanged. File: `src/hearsay/app.py`.
- [ ] 3.4 Replace the hard-coded live-view delay disclaimer with profile-aware status/delay messaging. File: `src/hearsay/ui/live_view.py`.

## 4. Tests

- [ ] 4.1 Add tests proving normal profile preserves 30s scheduling and live profile emits at the configured short interval, with final partial-window flush on stop. File: `tests/test_low_latency_transcription.py`.
- [ ] 4.2 Add short-window overlap/dedup regression fixtures proving boundary words are not persistently duplicated. Files: `tests/test_low_latency_transcription.py`, existing pipeline helpers.
- [ ] 4.3 Add deterministic throughput/backlog tests for healthy -> behind -> recovered transitions and bounded queue configuration without relying on wall-clock sleeps.
- [ ] 4.4 Run existing recorder/pipeline tests and `scripts/manual_device_check.py` to ensure device/recovery behavior is unchanged.

## 5. Windows profiling

- [ ] 5.1 Measure live-profile capture-window end -> finalized transcript event latency on the configured CPU model and record real-time factor/backlog behavior.
- [ ] 5.2 If an NVIDIA GPU is available, repeat with the configured GPU model and compare; do not bake hardware-specific timing into correctness tests.
- [ ] 5.3 Run a normal 30-second Hearsay session afterward and verify saved transcript behavior/quality remains unchanged.
