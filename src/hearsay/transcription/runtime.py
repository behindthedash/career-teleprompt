"""Profile-aware recorder and observable transcription pipeline."""

from __future__ import annotations

import logging
import queue
import time
from collections.abc import Callable
from typing import Any

from hearsay.audio.recorder import AudioChunk, AudioRecorder, _SilenceMonitor, _SourceBuffer
from hearsay.constants import SAMPLE_RATE, SILENCE_ALERT_S, SILENCE_REALERT_S
from hearsay.transcription.engine import TranscriptionEngine
from hearsay.transcription.pipeline import TranscriptionPipeline
from hearsay.transcription.profile import (
    NORMAL_TRANSCRIPTION_PROFILE,
    TranscriptionMetrics,
    TranscriptionProfile,
)

log = logging.getLogger(__name__)


class ProfiledAudioRecorder(AudioRecorder):
    """AudioRecorder using immutable session-scoped cadence/overlap settings."""

    def __init__(
        self,
        *args,
        profile: TranscriptionProfile = NORMAL_TRANSCRIPTION_PROFILE,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.profile = profile

    def _configure_buffer_overlap(self, buffers: list[_SourceBuffer]) -> None:
        """Apply this session's overlap to buffers created by the base recorder."""
        overlap_samples = int(self.profile.overlap_duration_s * SAMPLE_RATE)
        for buffer in buffers:
            buffer._overlap = overlap_samples

    def _capture_windows(self, buffers: list[_SourceBuffer], streams: list[Any]) -> None:
        """Cut source buffers at this session profile's wall-clock cadence."""
        self._configure_buffer_overlap(buffers)
        session_start = time.monotonic()
        window_open = 0.0
        chunk_index = 0
        dead_warned: set[int] = set()
        silence = _SilenceMonitor(SILENCE_ALERT_S, SILENCE_REALERT_S)
        silence.start(session_start)

        while not self.stopped():
            self.wait(timeout=0.5)
            now = time.monotonic()

            for i, stream in enumerate(streams):
                if i not in dead_warned and not self._stream_active(stream):
                    dead_warned.add(i)
                    log.warning(
                        "Capture stream %d (%s) is no longer active",
                        i,
                        buffers[i].source if i < len(buffers) else "?",
                    )
            if streams and len(dead_warned) == len(streams) and not self.stopped():
                raise RuntimeError("All capture streams stopped unexpectedly")

            if self.on_no_audio and not self.stopped() and silence.should_alert(now):
                log.warning(
                    "No audio captured for %.0fs (source=%s) — alerting user",
                    now - silence.last_audio,
                    self.source,
                )
                try:
                    self.on_no_audio()
                except Exception:
                    log.error("on_no_audio callback failed", exc_info=True)

            elapsed = now - session_start
            if elapsed - window_open < self.profile.chunk_duration_s:
                continue
            if self._emit_window(buffers, chunk_index, window_open):
                silence.note_audio(now)
            chunk_index += 1
            window_open = elapsed

        # Preserve the base recorder's final partial-window flush semantics.
        self._emit_window(buffers, chunk_index, window_open)


class ObservedTranscriptionPipeline(TranscriptionPipeline):
    """Transcription pipeline that reports content-free throughput observations."""

    def __init__(
        self,
        audio_queue: queue.Queue,
        transcript_queue: queue.Queue,
        engine: TranscriptionEngine,
        *,
        profile: TranscriptionProfile = NORMAL_TRANSCRIPTION_PROFILE,
        on_metrics: Callable[[TranscriptionMetrics], None] | None = None,
    ) -> None:
        super().__init__(
            audio_queue=audio_queue,
            transcript_queue=transcript_queue,
            engine=engine,
        )
        self.profile = profile
        self.on_metrics = on_metrics

    def _process_window(self, chunk: AudioChunk) -> None:
        started = time.perf_counter()
        super()._process_window(chunk)
        elapsed = time.perf_counter() - started

        audio_duration = self._new_audio_duration(chunk)
        realtime_factor = elapsed / audio_duration if audio_duration > 0 else 0.0
        queue_depth = self.audio_queue.qsize()
        metrics = TranscriptionMetrics(
            profile_name=self.profile.name,
            chunk_index=chunk.index,
            audio_duration_s=audio_duration,
            processing_elapsed_s=elapsed,
            realtime_factor=realtime_factor,
            queue_depth=queue_depth,
            health=self.profile.classify(realtime_factor, queue_depth),
        )

        log.info(
            "Transcription health profile=%s chunk=%d audio=%.2fs elapsed=%.2fs "
            "rtf=%.2fx backlog=%d health=%s",
            metrics.profile_name,
            metrics.chunk_index,
            metrics.audio_duration_s,
            metrics.processing_elapsed_s,
            metrics.realtime_factor,
            metrics.queue_depth,
            metrics.health.value,
        )

        if self.on_metrics is not None:
            try:
                self.on_metrics(metrics)
            except Exception:
                log.error("Transcription metrics callback failed", exc_info=True)

    def _new_audio_duration(self, chunk: AudioChunk) -> float:
        """Estimate new audio represented by a chunk, excluding repeated overlap."""
        if not chunk.parts:
            return 0.0
        payload_duration = max(len(audio) for audio in chunk.parts.values()) / SAMPLE_RATE
        if chunk.index == 0:
            return min(payload_duration, self.profile.chunk_duration_s)
        new_duration = payload_duration - self.profile.overlap_duration_s
        if new_duration <= 0:
            new_duration = payload_duration
        return min(new_duration, self.profile.chunk_duration_s)
