# Low-latency transcription profiling

The initial live transcription profile is a profiling baseline, not a promise that every machine can sustain it:

- capture window: 4 seconds
- overlap: 1 second
- model: whatever model the user explicitly configured; Hearsay does not auto-switch models

For every processed window Hearsay logs content-free throughput measurements:

- effective new audio duration
- transcription processing elapsed time
- realtime factor (RTF)
- pending audio-queue depth
- `healthy` or `behind` classification

The default live health thresholds are RTF <= 1.0 and queue depth <= 1. A higher RTF or deeper backlog reports `behind` in the live status instead of silently accumulating delay.

## Windows validation matrix

Before changing the 4s/1s baseline, run representative live speech on Windows and record sustained RTF/backlog behavior for at least:

| Device | Compute | Model | Result |
| --- | --- | --- | --- |
| CPU-only | `int8` | configured CPU model | pending |
| NVIDIA GPU | `float16` | configured GPU model | pending |

Capture at least several minutes of normal conversation for each configuration. Record model, CPU/GPU, average and worst RTF, maximum queue depth, and whether the status remained healthy or became persistently behind.

If a configuration cannot sustain the live cadence, treat that as profiling data. Do not hide it by automatically changing models. A future explicit change may add user-selectable profiles or model/cadence recommendations based on measured hardware behavior.
