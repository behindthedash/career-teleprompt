"""Entry point for Hearsay: python -m hearsay"""

from __future__ import annotations

import sys


def _diagnostics_packaging_smoke() -> None:
    """Verify the frozen bundle contains the normal diagnostics UI/domain path."""
    from hearsay.diagnostics.gpu_preflight import build_gpu_preflight_command
    from hearsay.diagnostics.performance import detect_hardware_availability
    from hearsay.diagnostics.runner import DiagnosticRunner
    from hearsay.transcription.gpu_runtime import RUNTIME_PACKAGES, gpu_runtime_status
    from hearsay.ui.performance_window import PerformanceDiagnosticsWindow
    from hearsay.ui.settings_window import SettingsWindow

    availability = detect_hardware_availability()
    if availability.cpu.device != "cpu":
        raise RuntimeError("CPU diagnostics configuration is unavailable")
    if not hasattr(SettingsWindow, "_open_performance_test"):
        raise RuntimeError("Settings diagnostics entry point is missing")
    if PerformanceDiagnosticsWindow is None or DiagnosticRunner is None:
        raise RuntimeError("Diagnostics implementation is missing from the package")
    command = build_gpu_preflight_command("turbo", "float16", frozen=True)
    if "--gpu-preflight" not in command:
        raise RuntimeError("GPU diagnostics preflight entry point is missing")
    if len(RUNTIME_PACKAGES) != 2 or gpu_runtime_status().bin_dir.name != "bin":
        raise RuntimeError("Optional GPU runtime installer is missing from the package")


def _gpu_inference_preflight(model_name: str, compute_type: str) -> None:
    """Exercise one real CUDA inference for the parent diagnostics process."""
    # Activate Hearsay's optional app-local CUDA/cuDNN DLL directory before
    # faster-whisper/CTranslate2 is imported. A compatible system-wide runtime
    # can still be used when the Hearsay-managed runtime is not installed.
    from hearsay.transcription.gpu_runtime import activate_gpu_runtime

    activate_gpu_runtime()

    import numpy as np
    from faster_whisper import WhisperModel

    from hearsay.constants import SAMPLE_RATE
    from hearsay.transcription.model_manager import ensure_model_materialized

    model_path = ensure_model_materialized(model_name)
    model = WhisperModel(
        str(model_path),
        device="cuda",
        compute_type=compute_type,
    )
    # faster-whisper begins inference when the returned segment generator is
    # consumed, not when transcribe() is called. VAD is disabled so even this
    # synthetic one-second sample exercises the CUDA runtime and kernels.
    audio = np.zeros(SAMPLE_RATE, dtype=np.float32)
    segments, _ = model.transcribe(
        audio,
        beam_size=1,
        language="en",
        vad_filter=False,
    )
    list(segments)


def _run_gpu_preflight_cli() -> None:
    try:
        index = sys.argv.index("--gpu-preflight")
        model_name = sys.argv[index + 1]
        compute_type = sys.argv[index + 2]
    except (ValueError, IndexError):
        print("GPU preflight requires MODEL_NAME and COMPUTE_TYPE", file=sys.stderr)
        raise SystemExit(2) from None

    try:
        _gpu_inference_preflight(model_name, compute_type)
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(3) from exc


def main() -> None:
    from hearsay.utils.logging_setup import setup_logging

    setup_logging()

    if "--diagnostics-smoke" in sys.argv:
        _diagnostics_packaging_smoke()
        return
    if "--gpu-preflight" in sys.argv:
        _run_gpu_preflight_cli()
        return

    from hearsay.app import HearsayApp

    app = HearsayApp()
    app.run()


if __name__ == "__main__":
    main()
