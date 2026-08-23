"""Synthetic coverage for in-app live performance diagnostics."""

from __future__ import annotations

import json
import sys
import time
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from hearsay.config import AppConfig
from hearsay.diagnostics.performance import (
    DiagnosticObservation,
    DiagnosticResult,
    DiagnosticStatus,
    HostInfo,
    InferenceConfiguration,
    Suitability,
    aggregate_observations,
    classify_suitability,
    detect_hardware_availability,
    render_result_text,
)
from hearsay.diagnostics.runner import DiagnosticRunner, DiagnosticRunnerState
from hearsay.session import SessionOutputMode
from hearsay.transcription.gpu_detect import GPUInfo
from hearsay.transcription.profile import (
    LIVE_TRANSCRIPTION_PROFILE,
    TranscriptionHealth,
    TranscriptionMetrics,
)

HOST = HostInfo(
    system="Windows",
    release="11",
    machine="AMD64",
    processor="Synthetic CPU",
    nvidia_gpu="Synthetic NVIDIA",
    nvidia_vram_gb=12.0,
)
CPU = InferenceConfiguration(
    label="CPU",
    model_name="small.en",
    device="cpu",
    compute_type="int8",
)
GPU = InferenceConfiguration(
    label="NVIDIA GPU",
    model_name="turbo",
    device="cuda",
    compute_type="float16",
)


def _observation(
    index: int,
    *,
    audio: float = 4.0,
    elapsed: float = 1.0,
    rtf: float = 0.25,
    queue_depth: int = 0,
    health: str = "healthy",
) -> DiagnosticObservation:
    return DiagnosticObservation(
        chunk_index=index,
        audio_duration_s=audio,
        processing_elapsed_s=elapsed,
        realtime_factor=rtf,
        queue_depth=queue_depth,
        health=health,
    )


def _completed_aggregate(
    *,
    healthy: int = 10,
    behind: int = 0,
    behind_rtf: float = 1.1,
    behind_queue: int = 2,
):
    observations = [_observation(i) for i in range(healthy)]
    observations.extend(
        _observation(
            healthy + i,
            elapsed=behind_rtf * 4,
            rtf=behind_rtf,
            queue_depth=behind_queue,
            health="behind",
        )
        for i in range(behind)
    )
    return aggregate_observations(observations, required_sample_s=4.0)


def _wait_for(predicate, timeout: float = 2.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    raise AssertionError("condition was not met before timeout")


def test_shared_aggregation_matches_offline_metric_definitions() -> None:
    observations = [
        _observation(0, audio=4.0, elapsed=2.0, rtf=0.5),
        _observation(1, audio=3.0, elapsed=2.25, rtf=0.75, queue_depth=1),
        _observation(
            2,
            audio=3.0,
            elapsed=3.6,
            rtf=1.2,
            queue_depth=2,
            health="behind",
        ),
        _observation(
            3,
            audio=3.0,
            elapsed=3.3,
            rtf=1.1,
            queue_depth=2,
            health="behind",
        ),
        _observation(4, audio=1.0, elapsed=0.4, rtf=0.4),
    ]

    aggregate = aggregate_observations(observations, required_sample_s=12.0)

    assert aggregate.observation_count == 5
    assert aggregate.effective_audio_s == 14.0
    assert aggregate.processing_elapsed_s == 11.55
    assert aggregate.aggregate_rtf == 0.825
    assert aggregate.median_rtf == 0.75
    assert aggregate.p95_rtf == 1.2
    assert aggregate.max_rtf == 1.2
    assert aggregate.max_queue_depth == 2
    assert aggregate.healthy_observations == 3
    assert aggregate.behind_observations == 2
    assert aggregate.healthy_percent == 60.0
    assert aggregate.longest_behind_streak == 2
    assert aggregate.sample_target_met is True
    assert aggregate.progress_fraction == 1.0


def test_sample_progress_is_effective_audio_not_wall_clock() -> None:
    aggregate = aggregate_observations(
        [_observation(0, audio=4.0), _observation(1, audio=3.0)],
        required_sample_s=10.0,
    )

    assert aggregate.effective_audio_s == 7.0
    assert aggregate.progress_fraction == 0.7
    assert aggregate.sample_target_met is False
    assert classify_suitability(aggregate) is None


def test_suitability_rules_cover_suitable_marginal_and_unsuitable() -> None:
    suitable = _completed_aggregate(healthy=10)
    marginal = _completed_aggregate(healthy=9, behind=1)
    unsuitable = _completed_aggregate(healthy=6, behind=4)

    assert classify_suitability(suitable) is Suitability.SUITABLE
    assert classify_suitability(marginal) is Suitability.MARGINAL
    assert classify_suitability(unsuitable) is Suitability.UNSUITABLE


def test_sustained_backlog_is_unsuitable_even_with_many_healthy_windows() -> None:
    observations = [_observation(i) for i in range(19)]
    observations.append(_observation(19, elapsed=4.4, rtf=1.1, queue_depth=4, health="behind"))
    aggregate = aggregate_observations(observations, required_sample_s=4.0)

    assert aggregate.healthy_percent == 95.0
    assert classify_suitability(aggregate) is Suitability.UNSUITABLE


def test_hardware_availability_always_offers_cpu_and_gates_gpu_by_support() -> None:
    cpu_only = detect_hardware_availability(
        lambda: GPUInfo(False, "", 0.0, "small.en", "int8", "cpu")
    )
    low_vram = detect_hardware_availability(
        lambda: GPUInfo(True, "Tiny GPU", 4.0, "small.en", "float16", "cuda")
    )
    capable = detect_hardware_availability(
        lambda: GPUInfo(True, "Fast GPU", 12.0, "turbo", "float16", "cuda")
    )

    assert cpu_only.cpu == CPU
    assert cpu_only.gpu is None
    assert "No supported NVIDIA" in (cpu_only.gpu_unavailable_reason or "")
    assert low_vram.gpu is None
    assert "requires about 6 GB VRAM" in (low_vram.gpu_unavailable_reason or "")
    assert capable.gpu == GPU
    assert capable.gpu_name == "Fast GPU"


def test_diagnostic_result_exports_only_content_free_fields() -> None:
    aggregate = _completed_aggregate(healthy=10)
    result = DiagnosticResult(
        status=DiagnosticStatus.COMPLETE,
        source="system",
        configuration=CPU,
        profile_name="live",
        chunk_duration_s=4.0,
        overlap_duration_s=1.0,
        aggregate=aggregate,
        suitability=Suitability.SUITABLE,
        host=HOST,
        message="Performance test completed successfully.",
    )

    text = render_result_text(result)
    payload = json.dumps(result.to_dict())

    for forbidden in ["SECRET TRANSCRIPT WORDS", ".md", "transcript_path", "audio_path"]:
        assert forbidden not in text
        assert forbidden not in payload
    assert "small.en/cpu/int8" in text
    assert '"suitability": "Suitable"' in payload


class _FakeEngine:
    def __init__(self, *, fail_load: bool = False, **kwargs) -> None:
        self.kwargs = kwargs
        self.fail_load = fail_load
        self.loaded = False
        self.unloaded = False

    def load(self) -> None:
        if self.fail_load:
            raise RuntimeError("synthetic CUDA load failure")
        self.loaded = True

    def unload(self) -> None:
        self.unloaded = True


class _FakeComponent:
    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.alive = False

    def start(self) -> None:
        self.alive = True

    def stop(self) -> None:
        self.alive = False

    def join(self, timeout=None) -> None:
        self.alive = False

    def is_alive(self) -> bool:
        return self.alive


def _runner_harness(tmp_path, *, inference=CPU, fail_load: bool = False):
    captured: dict[str, object] = {}
    results = []
    progress = []
    config = AppConfig(output_dir=str(tmp_path), model_name="medium", device="cpu")
    original = asdict(config)

    def engine_factory(**kwargs):
        engine = _FakeEngine(fail_load=fail_load, **kwargs)
        captured["engine"] = engine
        return engine

    def pipeline_factory(**kwargs):
        pipeline = _FakeComponent(**kwargs)
        captured["pipeline"] = pipeline
        captured["metric_callback"] = kwargs["on_metrics"]
        return pipeline

    def recorder_factory(**kwargs):
        recorder = _FakeComponent(**kwargs)
        captured["recorder"] = recorder
        captured["fatal_callback"] = kwargs["on_fatal"]
        return recorder

    runner = DiagnosticRunner(
        app_config=config,
        source="system",
        inference=inference,
        required_sample_s=10.0,
        host=HOST,
        on_progress=progress.append,
        on_result=results.append,
        engine_factory=engine_factory,
        pipeline_factory=pipeline_factory,
        recorder_factory=recorder_factory,
    )
    return runner, captured, results, progress, config, original


def test_runner_uses_live_only_profile_fixed_inference_and_does_not_mutate_config(tmp_path) -> None:
    runner, captured, results, progress, config, original = _runner_harness(tmp_path)

    runner.start()
    _wait_for(lambda: runner.state is DiagnosticRunnerState.RUNNING)

    engine = captured["engine"]
    pipeline = captured["pipeline"]
    recorder = captured["recorder"]
    assert isinstance(engine, _FakeEngine)
    assert isinstance(pipeline, _FakeComponent)
    assert isinstance(recorder, _FakeComponent)
    assert runner.output_mode is SessionOutputMode.LIVE_ONLY
    assert runner.profile is LIVE_TRANSCRIPTION_PROFILE
    assert engine.kwargs["model_name"] == "small.en"
    assert engine.kwargs["device"] == "cpu"
    assert engine.kwargs["compute_type"] == "int8"
    assert pipeline.kwargs["profile"] is LIVE_TRANSCRIPTION_PROFILE
    assert recorder.kwargs["profile"] is LIVE_TRANSCRIPTION_PROFILE
    assert asdict(config) == original

    metric_callback = captured["metric_callback"]
    assert callable(metric_callback)
    for index in range(3):
        metric_callback(
            TranscriptionMetrics(
                profile_name="live",
                chunk_index=index,
                audio_duration_s=4.0,
                processing_elapsed_s=1.0,
                realtime_factor=0.25,
                queue_depth=0,
                health=TranscriptionHealth.HEALTHY,
            )
        )

    assert runner.current_aggregate().sample_target_met is True
    assert progress[-1].aggregate.effective_audio_s == 12.0
    runner.stop()
    _wait_for(lambda: bool(results))

    assert results[0].status is DiagnosticStatus.COMPLETE
    assert results[0].suitability is Suitability.SUITABLE
    assert not list(tmp_path.glob("*.md"))
    assert asdict(config) == original


def test_runner_cancel_before_target_is_incomplete_and_unclassified(tmp_path) -> None:
    runner, captured, results, _, _, _ = _runner_harness(tmp_path)
    runner.start()
    _wait_for(lambda: runner.state is DiagnosticRunnerState.RUNNING)

    metric_callback = captured["metric_callback"]
    assert callable(metric_callback)
    metric_callback(
        TranscriptionMetrics(
            profile_name="live",
            chunk_index=0,
            audio_duration_s=4.0,
            processing_elapsed_s=1.0,
            realtime_factor=0.25,
            queue_depth=0,
            health=TranscriptionHealth.HEALTHY,
        )
    )
    runner.stop(cancelled=True)
    _wait_for(lambda: bool(results))

    assert results[0].status is DiagnosticStatus.CANCELLED
    assert results[0].aggregate is not None
    assert results[0].aggregate.sample_target_met is False
    assert results[0].suitability is None


def test_runner_surfaces_model_load_failure_without_completed_result(tmp_path) -> None:
    runner, _, results, _, _, _ = _runner_harness(
        tmp_path,
        inference=GPU,
        fail_load=True,
    )
    runner.start()
    _wait_for(lambda: bool(results))

    assert results[0].status is DiagnosticStatus.FAILED
    assert results[0].suitability is None
    assert "Could not load NVIDIA GPU configuration" in (results[0].message or "")
    assert "synthetic CUDA load failure" in (results[0].message or "")


def test_runner_surfaces_recorder_failure_without_suitability(tmp_path) -> None:
    runner, captured, results, _, _, _ = _runner_harness(tmp_path)
    runner.start()
    _wait_for(lambda: runner.state is DiagnosticRunnerState.RUNNING)

    fatal_callback = captured["fatal_callback"]
    assert callable(fatal_callback)
    fatal_callback(RuntimeError("synthetic device failure"))
    _wait_for(lambda: bool(results))

    assert results[0].status is DiagnosticStatus.FAILED
    assert results[0].suitability is None
    assert "synthetic device failure" in (results[0].message or "")
