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

## Reproducible report harness

After a live-profile recording, summarize the current daily Hearsay log with:

```powershell
python scripts/summarize_live_profile.py
```

The script defaults to the newest `%APPDATA%\Hearsay\logs\hearsay_*.log` file and reports the latest live session containing transcription metrics. An explicit log path can be supplied when needed:

```powershell
python scripts/summarize_live_profile.py "$env:APPDATA\Hearsay\logs\hearsay_2026-08-22.log"
```

Useful options:

```powershell
# Report every live session found in the selected log.
python scripts/summarize_live_profile.py --all

# Emit a machine-readable result that can be attached to an issue or PR.
python scripts/summarize_live_profile.py --json --output "$env:TEMP\hearsay-live-profile.json"

# Raise the required effective-audio sample duration above the default 3 minutes.
python scripts/summarize_live_profile.py --minimum-sample-minutes 5
```

The report reconstructs session boundaries from application lifecycle messages, includes the configured model/device/compute type, and aggregates only the content-free `Transcription health` lines. It deliberately ignores transcript text and does not copy transcript content into either text or JSON output.

A report includes:

- effective audio duration and whether the minimum sample target was met;
- aggregate, median, p95, and maximum RTF;
- maximum queue depth;
- healthy/behind observation counts and healthy percentage;
- longest consecutive `behind` streak;
- whether a normal session stop was observed;
- current Windows/CPU metadata and NVIDIA GPU name when `nvidia-smi` is available.

Do not treat a report with `sample target = NOT MET` as completion of the hardware validation task. The default target is three minutes of effective audio.

## Windows validation matrix

Before changing the 4s/1s baseline, run representative live speech on Windows and record sustained RTF/backlog behavior for at least:

| Device | Compute | Model | Result |
| --- | --- | --- | --- |
| CPU-only | `int8` | configured CPU model | pending |
| NVIDIA GPU | `float16` | configured GPU model | pending |

For each configuration:

1. Start Hearsay with the live 4s/1s profile and the intended model/device/compute type.
2. Capture at least three minutes of normal conversation.
3. Stop the session normally so teardown/final-window metrics are present.
4. Run `scripts/summarize_live_profile.py` immediately on that machine.
5. Save the content-free text or JSON summary outside the repository or attach it to the validation discussion.
6. Confirm the report identifies the expected CPU/GPU configuration and says the sample target was met.
7. Record aggregate/p95/max RTF, maximum queue depth, healthy percentage, and longest behind streak.

The harness intentionally does not invent a new pass/fail threshold. Existing runtime health remains authoritative: each observation is `behind` when RTF exceeds 1.0 or queue depth exceeds 1. The aggregate report exposes sustained behavior so a human can distinguish isolated slow windows from persistent backlog.

If a configuration cannot sustain the live cadence, treat that as profiling data. Do not hide it by automatically changing models. A future explicit change may add user-selectable profiles or model/cadence recommendations based on measured hardware behavior.
