"""Session-scoped transcription cadence and health models."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from hearsay.constants import CHUNK_DURATION_S, OVERLAP_DURATION_S


class TranscriptionHealth(str, Enum):
    """Whether transcription is keeping pace with captured audio."""

    HEALTHY = "healthy"
    BEHIND = "behind"


@dataclass(frozen=True)
class TranscriptionProfile:
    """Immutable session-level capture cadence and health thresholds."""

    name: str
    chunk_duration_s: float
    overlap_duration_s: float
    healthy_rtf_threshold: float = 1.0
    healthy_queue_depth: int = 1

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Transcription profile name must not be empty")
        if self.chunk_duration_s <= 0:
            raise ValueError("chunk_duration_s must be greater than zero")
        if self.overlap_duration_s < 0:
            raise ValueError("overlap_duration_s must not be negative")
        if self.overlap_duration_s >= self.chunk_duration_s:
            raise ValueError("overlap_duration_s must be shorter than chunk_duration_s")
        if self.healthy_rtf_threshold <= 0:
            raise ValueError("healthy_rtf_threshold must be greater than zero")
        if self.healthy_queue_depth < 0:
            raise ValueError("healthy_queue_depth must not be negative")

    def classify(self, realtime_factor: float, queue_depth: int) -> TranscriptionHealth:
        """Classify one processing observation using this profile's thresholds."""
        if realtime_factor > self.healthy_rtf_threshold or queue_depth > self.healthy_queue_depth:
            return TranscriptionHealth.BEHIND
        return TranscriptionHealth.HEALTHY


@dataclass(frozen=True)
class TranscriptionMetrics:
    """One content-free observation of transcription throughput/backpressure."""

    profile_name: str
    chunk_index: int
    audio_duration_s: float
    processing_elapsed_s: float
    realtime_factor: float
    queue_depth: int
    health: TranscriptionHealth


NORMAL_TRANSCRIPTION_PROFILE = TranscriptionProfile(
    name="normal",
    chunk_duration_s=float(CHUNK_DURATION_S),
    overlap_duration_s=float(OVERLAP_DURATION_S),
)

LIVE_TRANSCRIPTION_PROFILE = TranscriptionProfile(
    name="live",
    chunk_duration_s=4.0,
    overlap_duration_s=1.0,
)
