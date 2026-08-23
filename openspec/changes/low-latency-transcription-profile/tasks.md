## 1. Profile model
- [x] 1.1 Add normal and live `TranscriptionProfile` values.
- [x] 1.2 Parameterize recorder duration/overlap per instance.

## 2. Correctness
- [x] 2.1 Preserve overlap deduplication.
- [x] 2.2 Preserve final partial-window flush.

## 3. Observability
- [x] 3.1 Measure audio duration, processing elapsed/RTF, and queue depth.
- [x] 3.2 Surface healthy/behind live status.

## 4. Validation
- [x] 4.1 Regression-test normal 30s behavior.
- [x] 4.2 Add a reproducible content-free report harness for live-session RTF/backlog profiling.
- [ ] 4.3 Run representative several-minute live profiling on Windows CPU and NVIDIA GPU configurations and record the result summaries.
