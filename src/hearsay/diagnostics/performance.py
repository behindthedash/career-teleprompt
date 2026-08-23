"""Privacy-preserving live-transcription performance diagnostics."""

from __future__ import annotations

import math
import platform
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass
from enum import Enum

from hearsay.constants import (
    APP_VERSION,
    DEFAULT_CPU_COMPUTE,
    DEFAULT_CPU_MODEL,
    DEFAULT_GPU_COMPUTE,
    DEFAULT_GPU_MODEL,
    MODEL_TABLE,
)
from hearsay.transcription.gpu_detect import GPUInfo, detect_gpu
from hearsay.transcription.profile import TranscriptionMetrics

DEFAULT_REQUIRED_SAMPLE_S = 180.0

# Aggregate suitability rules. These summarize the existing per-window live
# health observations; they do not change the live profile's health thresholds.
SUITABLE_MIN_HEALTHY_PERCENT = 90.0
UNSUITABLE_BELOW_HEALTHY_PERCENT = 70.0
MARGINAL_QUEUE_DEPTH = 1
UNSUITABLE_QUEUE_DEPTH = 4
MARGINAL_BEHIND_STREAK = 2
UNSUITABLE_BEHIND_STREAK = 5


class Suitability(str, Enum):
    """Plain-language ability of one configuration to sustain live transcription."""

    SUITABLE = "Suitable"
    MARGINAL = "Marginal"
    UNSUITABLE = "Unsuitable"


class DiagnosticStatus(str, Enum):
    """Lifecycle outcome of a diagnostic run."""

    COMPLETE = "complete"
    INCOMPLETE = "incomplete"
    CANCELLED = "cancelled"
    FAILED = "failed"


@dataclass(frozen=True)
class DiagnosticObservation:
    """One content-free throughput observation."""

    chunk_index: int
    audio_duration_s: float
    processing_elapsed_s: float
    realtime_factor: float
    queue_depth: int
    health: str

    @classmethod
    def from_metrics(cls, metrics: TranscriptionMetrics) -> DiagnosticObservation:
        """Convert the runtime's authoritative metric into a content-free observation."""
        return cls(
            chunk_index=metrics.chunk_index,
            audio_duration_s=metrics.audio_duration_s,
            processing_elapsed_s=metrics.processing_elapsed_s,
            realtime_factor=metrics.realtime_factor,
            queue_depth=metrics.queue_depth,
            health=metrics.health.value,
        )


@dataclass(frozen=True)
class PerformanceAggregate:
    """Aggregate measurements shared by offline and in-app reporting."""

    observation_count: int
    effective_audio_s: float
    processing_elapsed_s: float
    aggregate_rtf: float
    median_rtf: float
    p95_rtf: float
    max_rtf: float
    max_queue_depth: int
    healthy_observations: int
    behind_observations: int
    healthy_percent: float
    longest_behind_streak: int
    required_sample_s: float
    sample_target_met: bool

    @property
    def progress_fraction(self) -> float:
        """Return bounded effective-audio progress toward the sample target."""
        if self.required_sample_s <= 0:
            return 1.0
        return min(1.0, self.effective_audio_s / self.required_sample_s)


@dataclass(frozen=True)
class HostInfo:
    """Content-free hardware/OS metadata."""

    system: str
    release: str
    machine: str
    processor: str
    nvidia_gpu: str | None
    nvidia_vram_gb: float | None = None


@dataclass(frozen=True)
class InferenceConfiguration:
    """Fixed inference configuration used for one diagnostic test."""

    label: str
    model_name: str
    device: str
    compute_type: str


@dataclass(frozen=True)
class HardwareAvailability:
    """Supported diagnostic configurations detected on the local machine."""

    cpu: InferenceConfiguration
    gpu: InferenceConfiguration | None
    gpu_name: str | None
    gpu_vram_gb: float | None
    gpu_unavailable_reason: str | None


@dataclass(frozen=True)
class DiagnosticResult:
    """Content-free result model. Transcript text and audio cannot be represented here."""

    status: DiagnosticStatus
    source: str
    configuration: InferenceConfiguration
    profile_name: str
    chunk_duration_s: float
    overlap_duration_s: float
    aggregate: PerformanceAggregate | None
    suitability: Suitability | None
    host: HostInfo
    application_version: str = APP_VERSION
    message: str | None = None

    def to_dict(self) -> dict[str, object]:
        """Return an export-safe JSON representation."""
        data: dict[str, object] = {
            "application_version": self.application_version,
            "status": self.status.value,
            "source": self.source,
            "configuration": asdict(self.configuration),
            "profile": {
                "name": self.profile_name,
                "chunk_duration_s": self.chunk_duration_s,
                "overlap_duration_s": self.overlap_duration_s,
            },
            "host": asdict(self.host),
            "suitability": self.suitability.value if self.suitability else None,
            "message": self.message,
            "aggregate": asdict(self.aggregate) if self.aggregate else None,
        }
        if self.aggregate is not None:
            aggregate = data["aggregate"]
            assert isinstance(aggregate, dict)
            aggregate["effective_audio_minutes"] = round(
                self.aggregate.effective_audio_s / 60.0, 3
            )
        return data


def aggregate_observations(
    observations: Iterable[DiagnosticObservation],
    *,
    required_sample_s: float = DEFAULT_REQUIRED_SAMPLE_S,
) -> PerformanceAggregate:
    """Aggregate content-free live observations using one canonical definition."""
    if required_sample_s <= 0:
        raise ValueError("required_sample_s must be greater than zero")

    values = list(observations)
    if not values:
        return PerformanceAggregate(
            observation_count=0,
            effective_audio_s=0.0,
            processing_elapsed_s=0.0,
            aggregate_rtf=0.0,
            median_rtf=0.0,
            p95_rtf=0.0,
            max_rtf=0.0,
            max_queue_depth=0,
            healthy_observations=0,
            behind_observations=0,
            healthy_percent=0.0,
            longest_behind_streak=0,
            required_sample_s=required_sample_s,
            sample_target_met=False,
        )

    rtfs = sorted(observation.realtime_factor for observation in values)
    audio_total = sum(observation.audio_duration_s for observation in values)
    processing_total = sum(observation.processing_elapsed_s for observation in values)
    healthy = sum(observation.health == "healthy" for observation in values)
    behind = len(values) - healthy

    return PerformanceAggregate(
        observation_count=len(values),
        effective_audio_s=round(audio_total, 3),
        processing_elapsed_s=round(processing_total, 3),
        aggregate_rtf=round(processing_total / audio_total, 4) if audio_total else 0.0,
        median_rtf=round(_percentile(rtfs, 0.50), 4),
        p95_rtf=round(_percentile(rtfs, 0.95), 4),
        max_rtf=round(max(rtfs), 4),
        max_queue_depth=max(observation.queue_depth for observation in values),
        healthy_observations=healthy,
        behind_observations=behind,
        healthy_percent=round(healthy / len(values) * 100.0, 2),
        longest_behind_streak=_longest_behind_streak(values),
        required_sample_s=required_sample_s,
        sample_target_met=audio_total >= required_sample_s,
    )


def classify_suitability(aggregate: PerformanceAggregate) -> Suitability | None:
    """Classify a completed sample using explicit aggregate health rules.

    Unsuitable means sustained inability to keep pace: aggregate RTF above realtime,
    fewer than 70% healthy windows, a queue depth of at least four, or five consecutive
    behind windows. Marginal means the sample otherwise completed but showed limited
    headroom: p95 RTF above realtime, fewer than 90% healthy windows, queue depth above
    the live-profile healthy limit, or at least two consecutive behind windows. All
    other completed samples are Suitable.
    """
    if not aggregate.sample_target_met:
        return None

    if (
        aggregate.aggregate_rtf > 1.0
        or aggregate.healthy_percent < UNSUITABLE_BELOW_HEALTHY_PERCENT
        or aggregate.max_queue_depth >= UNSUITABLE_QUEUE_DEPTH
        or aggregate.longest_behind_streak >= UNSUITABLE_BEHIND_STREAK
    ):
        return Suitability.UNSUITABLE

    if (
        aggregate.p95_rtf > 1.0
        or aggregate.healthy_percent < SUITABLE_MIN_HEALTHY_PERCENT
        or aggregate.max_queue_depth > MARGINAL_QUEUE_DEPTH
        or aggregate.longest_behind_streak >= MARGINAL_BEHIND_STREAK
    ):
        return Suitability.MARGINAL

    return Suitability.SUITABLE


def detect_hardware_availability(
    detector: Callable[[], GPUInfo] = detect_gpu,
) -> HardwareAvailability:
    """Detect supported CPU and NVIDIA CUDA diagnostic configurations."""
    cpu = InferenceConfiguration(
        label="CPU",
        model_name=DEFAULT_CPU_MODEL,
        device="cpu",
        compute_type=DEFAULT_CPU_COMPUTE,
    )
    gpu_info = detector()
    if not gpu_info.cuda_available:
        return HardwareAvailability(
            cpu=cpu,
            gpu=None,
            gpu_name=None,
            gpu_vram_gb=None,
            gpu_unavailable_reason="No supported NVIDIA CUDA inference device was detected.",
        )

    required_vram = float(MODEL_TABLE[DEFAULT_GPU_MODEL][1])
    if gpu_info.vram_gb > 0 and gpu_info.vram_gb < required_vram:
        return HardwareAvailability(
            cpu=cpu,
            gpu=None,
            gpu_name=gpu_info.gpu_name or "NVIDIA CUDA GPU",
            gpu_vram_gb=gpu_info.vram_gb,
            gpu_unavailable_reason=(
                f"{DEFAULT_GPU_MODEL} requires about {required_vram:g} GB VRAM; "
                f"detected {gpu_info.vram_gb:g} GB."
            ),
        )

    return HardwareAvailability(
        cpu=cpu,
        gpu=InferenceConfiguration(
            label="NVIDIA GPU",
            model_name=DEFAULT_GPU_MODEL,
            device="cuda",
            compute_type=DEFAULT_GPU_COMPUTE,
        ),
        gpu_name=gpu_info.gpu_name or "NVIDIA CUDA GPU",
        gpu_vram_gb=gpu_info.vram_gb if gpu_info.vram_gb > 0 else None,
        gpu_unavailable_reason=None,
    )


def collect_host_info(gpu_info: GPUInfo | None = None) -> HostInfo:
    """Collect content-free host metadata for display/export."""
    info = gpu_info or detect_gpu()
    return HostInfo(
        system=platform.system(),
        release=platform.release(),
        machine=platform.machine(),
        processor=platform.processor(),
        nvidia_gpu=info.gpu_name if info.cuda_available and info.gpu_name else None,
        nvidia_vram_gb=info.vram_gb if info.cuda_available and info.vram_gb > 0 else None,
    )


def render_result_text(result: DiagnosticResult) -> str:
    """Render a concise, content-free diagnostic report."""
    lines = [
        "Hearsay Transcription Performance Test",
        f"Application: Hearsay {result.application_version}",
        f"Status: {result.status.value}",
        f"Source: {result.source}",
        (
            f"Configuration: {result.configuration.label} — {result.configuration.model_name}/"
            f"{result.configuration.device}/{result.configuration.compute_type}"
        ),
        (
            f"Profile: {result.profile_name} "
            f"({result.chunk_duration_s:g}s/{result.overlap_duration_s:g}s)"
        ),
        (
            f"Host: {result.host.system} {result.host.release} {result.host.machine}; "
            f"CPU={result.host.processor or 'unknown'}"
        ),
    ]
    if result.host.nvidia_gpu:
        gpu = result.host.nvidia_gpu
        if result.host.nvidia_vram_gb is not None:
            gpu += f" ({result.host.nvidia_vram_gb:g} GB VRAM)"
        lines.append(f"NVIDIA GPU: {gpu}")

    aggregate = result.aggregate
    if aggregate is not None:
        sample_state = "met" if aggregate.sample_target_met else "NOT MET"
        lines.extend(
            [
                (
                    f"Sample: {aggregate.effective_audio_s / 60.0:.2f} min across "
                    f"{aggregate.observation_count} observations; target "
                    f"{aggregate.required_sample_s / 60.0:.2f} min = {sample_state}"
                ),
                (
                    f"RTF: aggregate={aggregate.aggregate_rtf:.2f}x, "
                    f"median={aggregate.median_rtf:.2f}x, p95={aggregate.p95_rtf:.2f}x, "
                    f"max={aggregate.max_rtf:.2f}x"
                ),
                (
                    f"Backlog: max={aggregate.max_queue_depth}; healthy="
                    f"{aggregate.healthy_observations}/{aggregate.observation_count} "
                    f"({aggregate.healthy_percent:.1f}%); behind="
                    f"{aggregate.behind_observations}; longest behind streak="
                    f"{aggregate.longest_behind_streak}"
                ),
            ]
        )

    if result.suitability is not None:
        lines.append(f"Assessment: {result.suitability.value}")
    else:
        lines.append("Assessment: not assigned (sample incomplete or run failed)")
    if result.message:
        lines.append(f"Message: {result.message}")
    return "\n".join(lines)


def _percentile(sorted_values: list[float], fraction: float) -> float:
    if not sorted_values:
        raise ValueError("percentile requires at least one value")
    if not 0 <= fraction <= 1:
        raise ValueError("fraction must be between zero and one")
    index = max(0, math.ceil(fraction * len(sorted_values)) - 1)
    return sorted_values[index]


def _longest_behind_streak(observations: Iterable[DiagnosticObservation]) -> int:
    longest = 0
    current = 0
    for observation in observations:
        if observation.health == "behind":
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest
