"""Tests for content-free low-latency profile reporting."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_script():
    path = ROOT / "scripts" / "summarize_live_profile.py"
    spec = importlib.util.spec_from_file_location("summarize_live_profile", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["summarize_live_profile"] = module
    spec.loader.exec_module(module)
    return module


profile_summary = _load_script()

HOST = profile_summary.HostInfo(
    system="Windows",
    release="11",
    machine="AMD64",
    processor="Synthetic CPU",
    nvidia_gpu=None,
)


def _sample_log() -> list[str]:
    return [
        "10:00:00 [INFO] hearsay.app: Starting recording "
        "(source=system, output_mode=persisted, profile=normal, cadence=30.0s/1.0s)",
        "10:00:01 [INFO] hearsay.transcription.engine: Loading model 'small.en' "
        "(device=cpu, compute=int8)",
        "10:00:31 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=normal chunk=0 audio=30.00s elapsed=5.00s rtf=0.17x backlog=0 health=healthy",
        "10:01:00 [INFO] hearsay.app: Stopping recording",
        "10:02:00 [INFO] hearsay.app: Starting recording "
        "(source=both, output_mode=live-only, profile=live, cadence=4.0s/1.0s)",
        "10:02:01 [INFO] hearsay.transcription.engine: Loading model 'small.en' "
        "(device=cpu, compute=int8)",
        "10:02:05 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=0 audio=4.00s elapsed=2.00s rtf=0.50x backlog=0 health=healthy",
        "10:02:09 [DEBUG] hearsay.output.markdown_writer: Appended text SECRET TRANSCRIPT WORDS",
        "10:02:09 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=1 audio=3.00s elapsed=2.25s rtf=0.75x backlog=1 health=healthy",
        "10:02:13 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=2 audio=3.00s elapsed=3.60s rtf=1.20x backlog=2 health=behind",
        "10:02:17 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=3 audio=3.00s elapsed=3.30s rtf=1.10x backlog=2 health=behind",
        "10:02:20 [INFO] hearsay.app: Stopping recording",
        "10:02:21 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=4 audio=1.00s elapsed=0.40s rtf=0.40x backlog=0 health=healthy",
        "10:05:00 [INFO] hearsay.app: Starting recording "
        "(source=mic, output_mode=live-only, profile=live, cadence=4.0s/1.0s)",
        "10:05:01 [INFO] hearsay.transcription.engine: Loading model 'turbo' "
        "(device=cuda, compute=float16)",
        "10:05:05 [INFO] hearsay.transcription.runtime: Transcription health "
        "profile=live chunk=0 audio=4.00s elapsed=0.40s rtf=0.10x backlog=0 health=healthy",
    ]


def test_parse_sessions_isolates_live_runs_and_keeps_teardown_metrics() -> None:
    sessions = profile_summary.parse_sessions(_sample_log())

    assert len(sessions) == 3
    first_live = sessions[1]
    second_live = sessions[2]

    assert first_live.profile_name == "live"
    assert first_live.model_name == "small.en"
    assert first_live.device == "cpu"
    assert first_live.compute_type == "int8"
    assert first_live.stopped is True
    assert [observation.chunk_index for observation in first_live.observations] == [0, 1, 2, 3, 4]

    assert second_live.model_name == "turbo"
    assert second_live.device == "cuda"
    assert second_live.stopped is False
    assert len(second_live.observations) == 1


def test_summary_reports_rtf_backlog_health_and_sample_completeness() -> None:
    session = profile_summary.parse_sessions(_sample_log())[1]
    summary = profile_summary.summarize_session(
        session,
        minimum_sample_minutes=0.2,
        host=HOST,
    )

    assert summary.observation_count == 5
    assert summary.effective_audio_s == 14.0
    assert summary.processing_elapsed_s == 11.55
    assert summary.aggregate_rtf == 0.825
    assert summary.median_rtf == 0.75
    assert summary.p95_rtf == 1.2
    assert summary.max_rtf == 1.2
    assert summary.max_queue_depth == 2
    assert summary.healthy_observations == 3
    assert summary.behind_observations == 2
    assert summary.healthy_percent == 60.0
    assert summary.longest_behind_streak == 2
    assert summary.sample_target_met is True


def test_default_three_minute_sample_does_not_claim_short_run_is_complete() -> None:
    session = profile_summary.parse_sessions(_sample_log())[1]
    summary = profile_summary.summarize_session(session, host=HOST)

    assert summary.required_sample_s == 180.0
    assert summary.sample_target_met is False


def test_report_never_copies_transcript_content() -> None:
    session = profile_summary.parse_sessions(_sample_log())[1]
    summary = profile_summary.summarize_session(
        session,
        minimum_sample_minutes=0.2,
        host=HOST,
    )

    text_report = profile_summary.render_text(summary)
    json_report = json.dumps(summary.to_dict())

    assert "SECRET TRANSCRIPT WORDS" not in text_report
    assert "SECRET TRANSCRIPT WORDS" not in json_report
    assert "small.en" in text_report
    assert '"aggregate_rtf": 0.825' in json_report


def test_only_live_sessions_with_metrics_are_selected() -> None:
    sessions = profile_summary.parse_sessions(_sample_log())

    selected = profile_summary._select_live_sessions(sessions)

    assert [session.index for session in selected] == [1, 2]
