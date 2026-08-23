# Low-latency transcription profiling

The initial live transcription profile is a profiling baseline, not a promise that every machine can sustain it:

- capture window: 4 seconds
- overlap: 1 second
- model: whatever model the user explicitly configured for ordinary recording; diagnostic tests use fixed supported CPU/GPU configurations without changing that setting

For every processed window Hearsay logs content-free throughput measurements:

- effective new audio duration
- transcription processing elapsed time
- realtime factor (RTF)
- pending audio-queue depth
- `healthy` or `behind` classification

The default live health thresholds are RTF <= 1.0 and queue depth <= 1. A higher RTF or deeper backlog reports `behind` in the live status instead of silently accumulating delay.

## Installed-app performance test

Normal users should validate live performance from **Hearsay Settings → Performance Test...**. The installed workflow requires no Git, Python, PowerShell, repository checkout, or external launcher. It runs the existing 4s/1s live profile in live-only mode, requires at least three minutes of effective audio, presents aggregate performance and a documented Suitable/Marginal/Unsuitable assessment, and can export a content-free text or JSON report.

See [`live-performance-diagnostics.md`](live-performance-diagnostics.md) for the user workflow, supported CPU/GPU configurations, suitability rules, privacy behavior, and export contents.

## Developer/offline report harness

The command-line harness remains useful for historical logs, regression investigation, and validating that offline and in-app aggregation stay aligned. After a live-profile recording, summarize the current daily Hearsay log with:

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

The report reconstructs session boundaries from application lifecycle messages, includes the configured model/device/compute type, and aggregates only the content-free `Transcription health` lines. It deliberately ignores transcript text and does not copy transcript content into either text or JSON output. Its aggregate calculations now use the same shared implementation as the installed diagnostics workflow.

A report includes:

- effective audio duration and whether the minimum sample target was met;
- aggregate, median, p95, and maximum RTF;
- maximum queue depth;
- healthy/behind observation counts and healthy percentage;
- longest consecutive `behind` streak;
- whether a normal session stop was observed;
- current Windows/CPU metadata and NVIDIA GPU name when available.

Do not treat a report with `sample target = NOT MET` as completion of the hardware validation task. The default target is three minutes of effective audio.

## Windows validation matrix

Before changing the 4s/1s baseline, run representative live speech through the installed performance-test UI and record sustained RTF/backlog behavior for at least:

| Device | Compute | Model | Result |
| --- | --- | --- | --- |
| CPU-only | `int8` | `small.en` | pending |
| NVIDIA GPU | `float16` | `turbo` | pending |

For each configuration:

1. Open **Settings → Performance Test...** in the packaged Hearsay application.
2. Select the same representative audio source/input for each comparison when practical.
3. Run the CPU or GPU test until the UI reports that at least three minutes of effective audio has been captured.
4. Complete the test normally.
5. Export the content-free text or JSON summary.
6. Confirm the report identifies the expected CPU/GPU configuration and says the sample target was met.
7. Record aggregate/p95/max RTF, maximum queue depth, healthy percentage, longest behind streak, and suitability assessment.

The existing runtime health remains authoritative for each window: an observation is `behind` when RTF exceeds 1.0 or queue depth exceeds 1. The installed diagnostics layer only adds documented aggregate categories so a user can distinguish comfortable headroom, intermittent pressure, and sustained inability to keep pace.

If a configuration cannot sustain the live cadence, treat that as profiling data. Do not hide it by automatically changing normal recording settings. Any future adaptive model/cadence behavior should be an explicit product change.
