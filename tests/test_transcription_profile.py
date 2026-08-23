"""Tests for session-scoped transcription cadence and observability."""

from __future__ import annotations

import queue
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np
import pytest

from hearsay.audio.recorder import AudioChunk, _SourceBuffer
from hearsay.constants import AUDIO_SOURCE_SYSTEM, SAMPLE_RATE
from hearsay.transcription.engine import TranscriptionResult
from hearsay.transcription.profile import (
    LIVE_TRANSCRIPTION_PROFILE,
    NORMAL_TRANSCRIPTION_PROFILE,
    TranscriptionHealth,
    TranscriptionProfile,
)
from hearsay.transcription.runtime import ObservedTranscriptionPipeline, ProfiledAudioRecorder


class FakeEngine:
    def transcribe(self, audio, chunk_index=0):
        return TranscriptionResult(
            text="hello",
            segments=[{"start": 0.0, "end": 0.5, "text": "hello"}],
            language="en",
            language_probability=0.99,
            chunk_index=chunk_index,
        )


def test_normal_and_live_profiles_preserve_expected_defaults() -> None:
    assert NORMAL_TRANSCRIPTION_PROFILE.chunk_duration_s == 30.0
    assert NORMAL_TRANSCRIPTION_PROFILE.overlap_duration_s == 1.0
    assert LIVE_TRANSCRIPTION_PROFILE.chunk_duration_s == 4.0
    assert LIVE_TRANSCRIPTION_PROFILE.overlap_duration_s == 1.0


def test_profile_validation_rejects_invalid_overlap() -> None:
    with pytest.raises(ValueError):
        TranscriptionProfile(name="bad", chunk_duration_s=4.0, overlap_duration_s=4.0)


def test_live_profile_applies_one_second_overlap_to_source_buffers() -> None:
    recorder = ProfiledAudioRecorder(
        audio_queue=queue.Queue(),
        profile=LIVE_TRANSCRIPTION_PROFILE,
    )
    buffer = _SourceBuffer(AUDIO_SOURCE_SYSTEM, overlap_samples=0)

    recorder._configure_buffer_overlap([buffer])
    buffer.append(np.ones(2 * SAMPLE_RATE, dtype=np.float32))
    first = buffer.cut()
    buffer.append(np.ones(SAMPLE_RATE, dtype=np.float32) * 0.5)
    second = buffer.cut()

    assert len(first) == 2 * SAMPLE_RATE
    assert len(second) == 2 * SAMPLE_RATE
    assert second[0] == 1.0
    assert second[-1] == 0.5


def test_profiled_recorder_flushes_final_partial_window(monkeypatch) -> None:
    recorder = ProfiledAudioRecorder(
        audio_queue=queue.Queue(),
        profile=LIVE_TRANSCRIPTION_PROFILE,
    )
    emitted = []
    times = iter([0.0, 4.1, 4.5])

    monkeypatch.setattr("hearsay.transcription.runtime.time.monotonic", lambda: next(times))
    monkeypatch.setattr(
        recorder,
        "_emit_window",
        lambda buffers, chunk_index, window_start: emitted.append(
            (chunk_index, window_start)
        )
        or True,
    )

    def fake_wait(timeout):
        if emitted:
            recorder.stop()
        return recorder.stopped()

    monkeypatch.setattr(recorder, "wait", fake_wait)

    recorder._capture_windows([], [])

    assert emitted == [(0, 0.0), (1, 4.1)]


def test_health_classification_uses_rtf_and_backlog_thresholds() -> None:
    profile = LIVE_TRANSCRIPTION_PROFILE

    assert profile.classify(0.5, 0) is TranscriptionHealth.HEALTHY
    assert profile.classify(1.1, 0) is TranscriptionHealth.BEHIND
    assert profile.classify(0.5, profile.healthy_queue_depth + 1) is TranscriptionHealth.BEHIND


def test_observed_pipeline_reports_audio_elapsed_rtf_and_queue_depth() -> None:
    audio_queue = queue.Queue()
    transcript_queue = queue.Queue()
    metrics = []
    pipeline = ObservedTranscriptionPipeline(
        audio_queue=audio_queue,
        transcript_queue=transcript_queue,
        engine=FakeEngine(),
        profile=LIVE_TRANSCRIPTION_PROFILE,
        on_metrics=metrics.append,
    )

    # Leave two queued windows behind the one being processed to force degraded health.
    audio_queue.put(object())
    audio_queue.put(object())
    chunk = AudioChunk(
        index=0,
        window_start=0.0,
        parts={AUDIO_SOURCE_SYSTEM: np.ones(4 * SAMPLE_RATE, dtype=np.float32)},
    )

    pipeline._process_window(chunk)

    assert len(metrics) == 1
    observation = metrics[0]
    assert observation.profile_name == "live"
    assert observation.chunk_index == 0
    assert observation.audio_duration_s == 4.0
    assert observation.processing_elapsed_s >= 0.0
    assert observation.realtime_factor >= 0.0
    assert observation.queue_depth == 2
    assert observation.health is TranscriptionHealth.BEHIND


def test_existing_pipeline_deduplication_remains_available_for_live_profile() -> None:
    pipeline = ObservedTranscriptionPipeline(
        audio_queue=queue.Queue(),
        transcript_queue=queue.Queue(),
        engine=FakeEngine(),
        profile=LIVE_TRANSCRIPTION_PROFILE,
    )
    result = TranscriptionResult(
        text="boundary words new speech",
        segments=[{"start": 0.0, "end": 1.0, "text": "boundary words new speech"}],
        language="en",
        language_probability=0.99,
        chunk_index=1,
    )

    deduped = pipeline._deduplicate(result, ["previous", "boundary", "words"])

    assert deduped.text == "new speech"
