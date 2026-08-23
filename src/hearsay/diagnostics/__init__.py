"""Content-free local diagnostics for Hearsay."""

from hearsay.diagnostics.performance import (
    DEFAULT_REQUIRED_SAMPLE_S,
    DiagnosticObservation,
    DiagnosticResult,
    DiagnosticStatus,
    HardwareAvailability,
    HostInfo,
    InferenceConfiguration,
    PerformanceAggregate,
    Suitability,
    aggregate_observations,
    classify_suitability,
    collect_host_info,
    detect_hardware_availability,
    render_result_text,
)

__all__ = [
    "DEFAULT_REQUIRED_SAMPLE_S",
    "DiagnosticObservation",
    "DiagnosticResult",
    "DiagnosticStatus",
    "HardwareAvailability",
    "HostInfo",
    "InferenceConfiguration",
    "PerformanceAggregate",
    "Suitability",
    "aggregate_observations",
    "classify_suitability",
    "collect_host_info",
    "detect_hardware_availability",
    "render_result_text",
]
