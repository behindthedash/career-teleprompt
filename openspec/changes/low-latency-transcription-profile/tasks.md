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
- [ ] 4.2 Profile initial 4s/1s live mode on Windows CPU/GPU configurations.
