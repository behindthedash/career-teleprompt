"""In-process runner for privacy-preserving live performance diagnostics."""

from __future__ import annotations

import logging
import queue
import threading
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any

from hearsay.config import AppConfig
from hearsay.diagnostics.performance import (
    DEFAULT_REQUIRED_SAMPLE_S,
    DiagnosticObservation,
    DiagnosticResult,
    DiagnosticStatus,
    HostInfo,
    InferenceConfiguration,
    PerformanceAggregate,
    aggregate_observations,
    classify_suitability,
    collect_host_info,
)
from hearsay.session import SessionOutputMode, create_session_writer
from hearsay.transcription.engine import TranscriptionEngine
from hearsay.transcription.profile import LIVE_TRANSCRIPTION_PROFILE, TranscriptionMetrics
from hearsay.transcription.runtime import ObservedTranscriptionPipeline, ProfiledAudioRecorder

log = logging.getLogger(__name__)


class DiagnosticRunnerState(str, Enum):
    """Live lifecycle state surfaced to the diagnostics UI."""

    IDLE = "idle"
    LOADING = "loading"
    RUNNING = "running"
    STOPPING = "stopping"
    FINISHED = "finished"


@dataclass(frozen=True)
class DiagnosticProgress:
    """Content-free progress snapshot for UI rendering."""

    state: DiagnosticRunnerState
    aggregate: PerformanceAggregate
    latest_health: str | None
    latest_rtf: float | None
    latest_queue_depth: int | None
    message: str


class DiagnosticRunner:
    """Own a live-only diagnostic recorder/transcription lifecycle.

    The runner intentionally does not publish transcript events, create a writer,
    or expose transcript results. It consumes the same runtime metrics as ordinary
    live transcription and promptly discards any transcript queue payloads.
    """

    output_mode = SessionOutputMode.LIVE_ONLY
    profile = LIVE_TRANSCRIPTION_PROFILE

    def __init__(
        self,
        *,
        app_config: AppConfig,
        source: str,
        inference: InferenceConfiguration,
        required_sample_s: float = DEFAULT_REQUIRED_SAMPLE_S,
        host: HostInfo | None = None,
        on_progress: Callable[[DiagnosticProgress], None] | None = None,
        on_result: Callable[[DiagnosticResult], None] | None = None,
        engine_factory: Callable[..., Any] = TranscriptionEngine,
        pipeline_factory: Callable[..., Any] = ObservedTranscriptionPipeline,
        recorder_factory: Callable[..., Any] = ProfiledAudioRecorder,
    ) -> None:
        if required_sample_s <= 0:
            raise ValueError("required_sample_s must be greater than zero")

        self._app_config = app_config
        self.source = source
        self.inference = inference
        self.required_sample_s = required_sample_s
        self.host = host or collect_host_info()
        self._on_progress = on_progress
        self._on_result = on_result
        self._engine_factory = engine_factory
        self._pipeline_factory = pipeline_factory
        self._recorder_factory = recorder_factory

        self._state = DiagnosticRunnerState.IDLE
        self._state_lock = threading.Lock()
        self._observations: list[DiagnosticObservation] = []
        self._audio_queue: queue.Queue = queue.Queue(maxsize=10)
        self._transcript_queue: queue.Queue = queue.Queue()
        self._engine: Any | None = None
        self._pipeline: Any | None = None
        self._recorder: Any | None = None
        self._stop_requested = threading.Event()
        self._teardown_started = threading.Event()
        self._cancel_requested = False
        self._failure_message: str | None = None
        self._result: DiagnosticResult | None = None

    @property
    def state(self) -> DiagnosticRunnerState:
        with self._state_lock:
            return self._state

    @property
    def result(self) -> DiagnosticResult | None:
        return self._result

    @property
    def is_active(self) -> bool:
        return self.state in {
            DiagnosticRunnerState.LOADING,
            DiagnosticRunnerState.RUNNING,
            DiagnosticRunnerState.STOPPING,
        }

    def start(self) -> None:
        """Begin model loading and then start the live diagnostic session."""
        with self._state_lock:
            if self._state is not DiagnosticRunnerState.IDLE:
                raise RuntimeError("diagnostic runner can only be started once")
            self._state = DiagnosticRunnerState.LOADING

        # Exercise the actual live-only persistence policy. A regression that
        # returns a writer here would be a privacy failure, so fail closed.
        if create_session_writer(self._app_config.output_dir, self.output_mode) is not None:
            self._finish_failure("Live-only session unexpectedly created a transcript writer.")
            return

        self._emit_progress("Loading transcription model...")
        threading.Thread(
            target=self._load_and_start,
            daemon=True,
            name="DiagnosticModelLoader",
        ).start()

    def stop(self, *, cancelled: bool = False) -> None:
        """Stop the run cleanly; completed samples are classified unless cancelled."""
        if not self.is_active:
            return
        self._cancel_requested = self._cancel_requested or cancelled
        self._stop_requested.set()

        if self.state is DiagnosticRunnerState.LOADING:
            self._emit_progress("Cancelling after model load completes...")
            return

        self._begin_teardown()

    def current_aggregate(self) -> PerformanceAggregate:
        """Return the current aggregate without transcript content."""
        with self._state_lock:
            observations = list(self._observations)
        return aggregate_observations(observations, required_sample_s=self.required_sample_s)

    def _load_and_start(self) -> None:
        try:
            engine = self._engine_factory(
                model_name=self.inference.model_name,
                device=self.inference.device,
                compute_type=self.inference.compute_type,
                language=self._app_config.language,
                vad_filter=self._app_config.vad_filter,
            )
            self._engine = engine
            engine.load()
        except Exception as exc:
            log.error("Diagnostic model load failed", exc_info=True)
            self._finish_failure(
                f"Could not load {self.inference.label} configuration: {exc}"
            )
            return

        if self._stop_requested.is_set():
            self._begin_teardown()
            return

        try:
            self._pipeline = self._pipeline_factory(
                audio_queue=self._audio_queue,
                transcript_queue=self._transcript_queue,
                engine=self._engine,
                profile=self.profile,
                on_metrics=self._on_metrics,
            )
            self._recorder = self._recorder_factory(
                audio_queue=self._audio_queue,
                source=self.source,
                profile=self.profile,
                mic_device_name=self._app_config.mic_device_name,
                loopback_device_name=self._app_config.loopback_device_name,
                on_fatal=self._on_recorder_fatal,
                on_no_audio=self._on_no_audio,
            )
            self._pipeline.start()
            self._recorder.start()
        except Exception as exc:
            log.error("Diagnostic session start failed", exc_info=True)
            self._failure_message = f"Could not start diagnostic capture: {exc}"
            self._begin_teardown()
            return

        with self._state_lock:
            if self._state is not DiagnosticRunnerState.FINISHED:
                self._state = DiagnosticRunnerState.RUNNING
        self._emit_progress("Test running — speak normally or play representative speech.")
        threading.Thread(
            target=self._watch_components,
            daemon=True,
            name="DiagnosticWatchdog",
        ).start()

    def _on_metrics(self, metrics: TranscriptionMetrics) -> None:
        observation = DiagnosticObservation.from_metrics(metrics)
        with self._state_lock:
            self._observations.append(observation)
        self._discard_transcripts()

        aggregate = self.current_aggregate()
        if aggregate.sample_target_met:
            message = "Sample target met — you can complete the test."
        else:
            remaining = max(0.0, aggregate.required_sample_s - aggregate.effective_audio_s)
            message = f"Collecting speech — {remaining:.0f}s of effective audio remaining."
        self._emit_progress(
            message,
            latest_health=observation.health,
            latest_rtf=observation.realtime_factor,
            latest_queue_depth=observation.queue_depth,
        )

    def _on_recorder_fatal(self, exc: Exception) -> None:
        self._failure_message = f"Audio capture failed: {exc}"
        self._begin_teardown()

    def _on_no_audio(self) -> None:
        self._emit_progress(
            "No usable audio is being captured. Check the selected source/device; "
            "silence does not count toward the sample target."
        )

    def _watch_components(self) -> None:
        while not self._stop_requested.wait(timeout=1.0):
            if self.state is not DiagnosticRunnerState.RUNNING:
                return
            recorder = self._recorder
            pipeline = self._pipeline
            if recorder is not None and not recorder.is_alive():
                self._failure_message = "Audio capture stopped unexpectedly."
                self._begin_teardown()
                return
            if pipeline is not None and not pipeline.is_alive():
                self._failure_message = "Transcription pipeline stopped unexpectedly."
                self._begin_teardown()
                return

    def _begin_teardown(self) -> None:
        if self._teardown_started.is_set():
            return
        self._teardown_started.set()
        self._stop_requested.set()
        with self._state_lock:
            if self._state is not DiagnosticRunnerState.FINISHED:
                self._state = DiagnosticRunnerState.STOPPING
        self._emit_progress("Stopping diagnostic session...")
        threading.Thread(
            target=self._teardown,
            daemon=True,
            name="DiagnosticTeardown",
        ).start()

    def _teardown(self) -> None:
        recorder = self._recorder
        pipeline = self._pipeline
        engine = self._engine

        try:
            if recorder is not None:
                recorder.stop()
                recorder.join(timeout=10)
                if recorder.is_alive() and self._failure_message is None:
                    self._failure_message = "Audio capture did not stop cleanly."

            if pipeline is not None:
                pipeline.stop()
                pipeline.join(timeout=60)
                if pipeline.is_alive() and self._failure_message is None:
                    self._failure_message = "Transcription pipeline did not stop cleanly."
        finally:
            if engine is not None:
                try:
                    engine.unload()
                except Exception:
                    log.warning("Diagnostic model unload failed", exc_info=True)
            self._discard_transcripts()
            self._finalize_result()

    def _finalize_result(self) -> None:
        aggregate = self.current_aggregate()
        if self._failure_message:
            status = DiagnosticStatus.FAILED
            suitability = None
            message = self._failure_message
        elif self._cancel_requested:
            status = DiagnosticStatus.CANCELLED
            suitability = None
            message = "Test cancelled. The sample is incomplete and was not classified."
        elif not aggregate.sample_target_met:
            status = DiagnosticStatus.INCOMPLETE
            suitability = None
            message = "Sample target was not met; no suitability assessment was assigned."
        else:
            status = DiagnosticStatus.COMPLETE
            suitability = classify_suitability(aggregate)
            message = "Performance test completed successfully."

        self._result = DiagnosticResult(
            status=status,
            source=self.source,
            configuration=self.inference,
            profile_name=self.profile.name,
            chunk_duration_s=self.profile.chunk_duration_s,
            overlap_duration_s=self.profile.overlap_duration_s,
            aggregate=aggregate,
            suitability=suitability,
            host=self.host,
            message=message,
        )
        with self._state_lock:
            self._state = DiagnosticRunnerState.FINISHED
        self._emit_result(self._result)

    def _finish_failure(self, message: str) -> None:
        self._failure_message = message
        aggregate = self.current_aggregate()
        self._result = DiagnosticResult(
            status=DiagnosticStatus.FAILED,
            source=self.source,
            configuration=self.inference,
            profile_name=self.profile.name,
            chunk_duration_s=self.profile.chunk_duration_s,
            overlap_duration_s=self.profile.overlap_duration_s,
            aggregate=aggregate,
            suitability=None,
            host=self.host,
            message=message,
        )
        engine = self._engine
        if engine is not None:
            try:
                engine.unload()
            except Exception:
                log.warning("Diagnostic model unload failed", exc_info=True)
        with self._state_lock:
            self._state = DiagnosticRunnerState.FINISHED
        self._emit_result(self._result)

    def _discard_transcripts(self) -> None:
        try:
            while True:
                self._transcript_queue.get_nowait()
        except queue.Empty:
            pass

    def _emit_progress(
        self,
        message: str,
        *,
        latest_health: str | None = None,
        latest_rtf: float | None = None,
        latest_queue_depth: int | None = None,
    ) -> None:
        if self._on_progress is None:
            return
        progress = DiagnosticProgress(
            state=self.state,
            aggregate=self.current_aggregate(),
            latest_health=latest_health,
            latest_rtf=latest_rtf,
            latest_queue_depth=latest_queue_depth,
            message=message,
        )
        try:
            self._on_progress(progress)
        except Exception:
            log.error("Diagnostic progress callback failed", exc_info=True)

    def _emit_result(self, result: DiagnosticResult) -> None:
        if self._on_result is None:
            return
        try:
            self._on_result(result)
        except Exception:
            log.error("Diagnostic result callback failed", exc_info=True)
