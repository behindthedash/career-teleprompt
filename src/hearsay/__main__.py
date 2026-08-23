"""Entry point for Hearsay: python -m hearsay"""

from __future__ import annotations

import sys


def _diagnostics_packaging_smoke() -> None:
    """Verify the frozen bundle contains the normal diagnostics UI/domain path."""
    from hearsay.diagnostics.performance import detect_hardware_availability
    from hearsay.diagnostics.runner import DiagnosticRunner
    from hearsay.ui.performance_window import PerformanceDiagnosticsWindow
    from hearsay.ui.settings_window import SettingsWindow

    availability = detect_hardware_availability()
    if availability.cpu.device != "cpu":
        raise RuntimeError("CPU diagnostics configuration is unavailable")
    if not hasattr(SettingsWindow, "_open_performance_test"):
        raise RuntimeError("Settings diagnostics entry point is missing")
    if PerformanceDiagnosticsWindow is None or DiagnosticRunner is None:
        raise RuntimeError("Diagnostics implementation is missing from the package")


def main() -> None:
    from hearsay.utils.logging_setup import setup_logging

    setup_logging()

    if "--diagnostics-smoke" in sys.argv:
        _diagnostics_packaging_smoke()
        return

    from hearsay.app import HearsayApp

    app = HearsayApp()
    app.run()


if __name__ == "__main__":
    main()
