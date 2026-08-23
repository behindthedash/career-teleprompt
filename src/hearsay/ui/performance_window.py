"""Installed-app UI for live transcription performance diagnostics."""

from __future__ import annotations

import json
import logging
import threading
from collections.abc import Callable
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk

from hearsay.config import AppConfig
from hearsay.constants import (
    APP_NAME,
    AUDIO_SOURCE_BOTH,
    AUDIO_SOURCE_MIC,
    AUDIO_SOURCE_SYSTEM,
)
from hearsay.diagnostics.performance import (
    DiagnosticResult,
    HardwareAvailability,
    InferenceConfiguration,
    collect_host_info,
    detect_hardware_availability,
    render_result_text,
)
from hearsay.diagnostics.runner import DiagnosticProgress, DiagnosticRunner
from hearsay.transcription.gpu_runtime import (
    GPU_RUNTIME_DOWNLOAD_ESTIMATE_GB,
    GPUInstallCancelled,
    GPUInstallProgress,
    gpu_runtime_status,
    install_gpu_runtime,
)
from hearsay.ui.window_icon import apply_window_icon

log = logging.getLogger(__name__)

_SOURCE_LABELS = {
    "System Audio": AUDIO_SOURCE_SYSTEM,
    "Microphone": AUDIO_SOURCE_MIC,
    "Both": AUDIO_SOURCE_BOTH,
}
_SOURCE_DISPLAY = {value: label for label, value in _SOURCE_LABELS.items()}


class PerformanceDiagnosticsWindow(ctk.CTkToplevel):
    """Run CPU/GPU live-profile diagnostics without developer tooling."""

    def __init__(
        self,
        master,
        app_config: AppConfig,
        *,
        on_close: Callable[[], None] | None = None,
        hardware: HardwareAvailability | None = None,
    ) -> None:
        super().__init__(master)
        self.title(f"{APP_NAME} — Transcription Performance")
        self.geometry("720x760")
        self.minsize(680, 690)
        apply_window_icon(self)

        self._config = app_config
        self._on_close_callback = on_close
        self._hardware = hardware or detect_hardware_availability()
        self._host = collect_host_info()
        self._runner: DiagnosticRunner | None = None
        self._result: DiagnosticResult | None = None
        self._close_when_finished = False
        self._gpu_install_active = False
        self._gpu_install_stop = threading.Event()
        self._gpu_install_button = None

        self._build_ui()
        self.protocol("WM_DELETE_WINDOW", self._close)
        self.grab_set()

    def _build_ui(self) -> None:
        ctk.CTkLabel(
            self,
            text="Transcription Performance Test",
            font=("Segoe UI", 22, "bold"),
        ).pack(pady=(18, 5))
        ctk.CTkLabel(
            self,
            text=(
                "Measures whether this PC can keep up with Hearsay's 4-second live "
                "transcription mode. Nothing is saved or uploaded."
            ),
            wraplength=650,
            justify="left",
        ).pack(padx=25, pady=(0, 12), anchor="w")

        setup = ctk.CTkFrame(self)
        setup.pack(fill="x", padx=25, pady=(0, 12))

        ctk.CTkLabel(setup, text="Audio source", font=("Segoe UI", 13, "bold")).grid(
            row=0, column=0, sticky="w", padx=12, pady=(12, 4)
        )
        source_initial = _SOURCE_DISPLAY.get(self._config.audio_source, "System Audio")
        self._source_var = ctk.StringVar(value=source_initial)
        self._source_menu = ctk.CTkOptionMenu(
            setup,
            variable=self._source_var,
            values=list(_SOURCE_LABELS),
            width=180,
        )
        self._source_menu.grid(row=1, column=0, sticky="w", padx=12, pady=(0, 12))

        ctk.CTkLabel(
            setup,
            text="Use representative speech for at least 3 minutes of captured audio.",
            text_color="gray",
        ).grid(row=1, column=1, sticky="w", padx=12, pady=(0, 12))
        setup.grid_columnconfigure(1, weight=1)

        config_frame = ctk.CTkFrame(self)
        config_frame.pack(fill="x", padx=25, pady=(0, 12))
        config_frame.grid_columnconfigure((0, 1), weight=1)

        _, self._cpu_button = self._build_config_card(
            config_frame,
            column=0,
            title="CPU test",
            detail=(
                f"{self._hardware.cpu.model_name} / {self._hardware.cpu.compute_type}\n"
                "Available on every supported PC"
            ),
            command=lambda: self._start(self._hardware.cpu),
        )

        if self._hardware.gpu is not None:
            gpu_name = self._hardware.gpu_name or "NVIDIA CUDA GPU"
            vram = (
                f" ({self._hardware.gpu_vram_gb:g} GB)"
                if self._hardware.gpu_vram_gb is not None
                else ""
            )
            runtime_ready = gpu_runtime_status().installed
            runtime_text = (
                "GPU support installed" if runtime_ready else "GPU support setup may be required"
            )
            gpu_frame, self._gpu_button = self._build_config_card(
                config_frame,
                column=1,
                title="NVIDIA GPU test",
                detail=(
                    f"{self._hardware.gpu.model_name} / {self._hardware.gpu.compute_type}\n"
                    f"{gpu_name}{vram}\n{runtime_text}"
                ),
                command=lambda: self._start(self._hardware.gpu),
            )
            self._gpu_install_button = ctk.CTkButton(
                gpu_frame,
                text=(
                    "GPU Support Installed"
                    if runtime_ready
                    else f"Install GPU Support (~{GPU_RUNTIME_DOWNLOAD_ESTIMATE_GB:g} GB)"
                ),
                command=self._install_gpu_support,
                state="disabled" if runtime_ready else "normal",
            )
            self._gpu_install_button.pack(anchor="w", padx=12, pady=(0, 12))
            ctk.CTkLabel(
                gpu_frame,
                text="Downloads official NVIDIA cuBLAS/cuDNN runtime files from PyPI.",
                wraplength=285,
                justify="left",
                text_color="gray",
                font=("Segoe UI", 10),
            ).pack(anchor="w", padx=12, pady=(0, 10))
        else:
            reason = self._hardware.gpu_unavailable_reason or "GPU test unavailable."
            _, self._gpu_button = self._build_config_card(
                config_frame,
                column=1,
                title="NVIDIA GPU test",
                detail=reason,
                command=lambda: None,
                enabled=False,
            )

        progress_frame = ctk.CTkFrame(self)
        progress_frame.pack(fill="x", padx=25, pady=(0, 12))
        ctk.CTkLabel(
            progress_frame,
            text="Test progress",
            font=("Segoe UI", 13, "bold"),
        ).pack(anchor="w", padx=12, pady=(10, 4))
        self._progress = ctk.CTkProgressBar(progress_frame)
        self._progress.set(0)
        self._progress.pack(fill="x", padx=12, pady=(0, 6))
        self._sample_label = ctk.CTkLabel(progress_frame, text="0:00 / 3:00 effective audio")
        self._sample_label.pack(anchor="w", padx=12)
        self._status_label = ctk.CTkLabel(
            progress_frame,
            text="Choose CPU or GPU to begin.",
            wraplength=640,
            justify="left",
        )
        self._status_label.pack(anchor="w", padx=12, pady=(4, 10))

        self._stop_button = ctk.CTkButton(
            self,
            text="Cancel Test",
            state="disabled",
            command=self._stop,
        )
        self._stop_button.pack(pady=(0, 12))

        ctk.CTkLabel(self, text="Result", font=("Segoe UI", 13, "bold")).pack(anchor="w", padx=25)
        self._result_box = ctk.CTkTextbox(self, height=210, font=("Consolas", 11))
        self._result_box.pack(fill="both", expand=True, padx=25, pady=(4, 10))
        self._result_box.insert("1.0", "No completed test yet.")
        self._result_box.configure(state="disabled")

        export_frame = ctk.CTkFrame(self)
        export_frame.pack(fill="x", padx=25, pady=(0, 18))
        self._export_text_button = ctk.CTkButton(
            export_frame,
            text="Export Text...",
            width=120,
            state="disabled",
            command=lambda: self._export("text"),
        )
        self._export_text_button.pack(side="right", padx=5, pady=8)
        self._export_json_button = ctk.CTkButton(
            export_frame,
            text="Export JSON...",
            width=120,
            state="disabled",
            command=lambda: self._export("json"),
        )
        self._export_json_button.pack(side="right", padx=5, pady=8)

    def _build_config_card(
        self,
        master,
        *,
        column: int,
        title: str,
        detail: str,
        command: Callable[[], None],
        enabled: bool = True,
    ):
        frame = ctk.CTkFrame(master)
        frame.grid(row=0, column=column, sticky="nsew", padx=6, pady=10)
        ctk.CTkLabel(frame, text=title, font=("Segoe UI", 14, "bold")).pack(
            anchor="w", padx=12, pady=(10, 4)
        )
        ctk.CTkLabel(frame, text=detail, wraplength=285, justify="left").pack(
            anchor="w", padx=12, pady=(0, 8)
        )
        button = ctk.CTkButton(
            frame,
            text="Run Test" if enabled else "Unavailable",
            command=command,
            state="normal" if enabled else "disabled",
        )
        button.pack(anchor="w", padx=12, pady=(0, 8))
        return frame, button

    def _install_gpu_support(self) -> None:
        if self._hardware.gpu is None or self._gpu_install_active:
            return
        if gpu_runtime_status().installed:
            self._refresh_gpu_install_button()
            return

        proceed = messagebox.askyesno(
            "Install Hearsay GPU Support",
            (
                "Hearsay will download approximately 1.3 GB of official NVIDIA CUDA 12 "
                "cuBLAS and cuDNN 9 runtime files from PyPI. Setup needs about 4 GB of "
                "temporary free disk space. The NVIDIA components are subject to NVIDIA's "
                "software license.\n\nInstall GPU support now?"
            ),
            parent=self,
        )
        if not proceed:
            return

        self._gpu_install_active = True
        self._gpu_install_stop.clear()
        self._result = None
        self._set_run_controls(False)
        self._export_text_button.configure(state="disabled")
        self._export_json_button.configure(state="disabled")
        self._progress.set(0)
        self._sample_label.configure(text="GPU support setup")
        self._status_label.configure(text="Preparing NVIDIA GPU support...")
        self._set_result_text(
            "Installing optional NVIDIA GPU support. No developer tools or system PATH changes are required."
        )
        self._stop_button.configure(state="normal", text="Cancel Setup")
        threading.Thread(
            target=self._install_gpu_support_bg,
            daemon=True,
            name="GPURuntimeInstaller",
        ).start()

    def _install_gpu_support_bg(self) -> None:
        try:
            install_gpu_runtime(
                progress_callback=self._on_gpu_install_progress,
                stop_event=self._gpu_install_stop,
            )
        except GPUInstallCancelled:
            self._ui_call(
                lambda: self._finish_gpu_install(
                    success=False,
                    message="GPU support installation cancelled.",
                )
            )
        except Exception as exc:
            log.error("GPU support installation failed", exc_info=True)
            message = f"GPU support installation failed: {exc}"
            self._ui_call(lambda message=message: self._finish_gpu_install(False, message))
        else:
            self._ui_call(
                lambda: self._finish_gpu_install(
                    success=True,
                    message=(
                        "GPU support installed successfully. Run NVIDIA GPU Test again; "
                        "Hearsay will verify the runtime with a real CUDA inference first."
                    ),
                )
            )

    def _on_gpu_install_progress(self, progress: GPUInstallProgress) -> None:
        self._ui_call(lambda: self._apply_gpu_install_progress(progress))

    def _apply_gpu_install_progress(self, progress: GPUInstallProgress) -> None:
        if progress.fraction is not None:
            self._progress.set(progress.fraction)
        self._status_label.configure(text=progress.message)

    def _finish_gpu_install(self, success: bool, message: str) -> None:
        self._gpu_install_active = False
        self._stop_button.configure(state="disabled", text="Cancel Test")
        self._progress.set(1 if success else 0)
        self._sample_label.configure(text="0:00 / 3:00 effective audio")
        self._status_label.configure(text=message)
        self._set_result_text(message)
        self._set_run_controls(True)
        self._refresh_gpu_install_button()
        if self._close_when_finished:
            self._destroy_window()

    def _refresh_gpu_install_button(self) -> None:
        if self._gpu_install_button is None:
            return
        if gpu_runtime_status().installed:
            self._gpu_install_button.configure(text="GPU Support Installed", state="disabled")
        else:
            self._gpu_install_button.configure(
                text=f"Install GPU Support (~{GPU_RUNTIME_DOWNLOAD_ESTIMATE_GB:g} GB)",
                state="disabled" if self._gpu_install_active else "normal",
            )

    def _start(self, inference: InferenceConfiguration | None) -> None:
        if (
            inference is None
            or self._gpu_install_active
            or (self._runner is not None and self._runner.is_active)
        ):
            return

        self._result = None
        self._set_result_text("Loading test configuration...")
        self._set_run_controls(False)
        self._stop_button.configure(state="normal", text="Cancel Test")
        source = _SOURCE_LABELS[self._source_var.get()]
        self._runner = DiagnosticRunner(
            app_config=self._config,
            source=source,
            inference=inference,
            host=self._host,
            on_progress=self._on_progress,
            on_result=self._on_result,
        )
        self._runner.start()

    def _stop(self) -> None:
        if self._gpu_install_active:
            self._gpu_install_stop.set()
            self._status_label.configure(text="Cancelling GPU support installation...")
            self._stop_button.configure(state="disabled")
            return

        runner = self._runner
        if runner is None or not runner.is_active:
            return
        target_met = runner.current_aggregate().sample_target_met
        runner.stop(cancelled=not target_met)
        self._stop_button.configure(state="disabled")

    def _on_progress(self, progress: DiagnosticProgress) -> None:
        self._ui_call(lambda: self._apply_progress(progress))

    def _apply_progress(self, progress: DiagnosticProgress) -> None:
        aggregate = progress.aggregate
        self._progress.set(aggregate.progress_fraction)
        elapsed = int(aggregate.effective_audio_s)
        target = int(aggregate.required_sample_s)
        self._sample_label.configure(
            text=(
                f"{elapsed // 60}:{elapsed % 60:02d} / "
                f"{target // 60}:{target % 60:02d} effective audio"
            )
        )
        detail = progress.message
        if progress.latest_health is not None:
            detail += (
                f"  Current: {progress.latest_health}; RTF {progress.latest_rtf:.2f}x; "
                f"backlog {progress.latest_queue_depth}."
            )
        self._status_label.configure(text=detail)
        if aggregate.sample_target_met and self._runner and self._runner.is_active:
            self._stop_button.configure(text="Complete Test", state="normal")

    def _on_result(self, result: DiagnosticResult) -> None:
        self._ui_call(lambda: self._apply_result(result))

    def _apply_result(self, result: DiagnosticResult) -> None:
        self._result = result
        self._progress.set(result.aggregate.progress_fraction if result.aggregate else 0)
        self._status_label.configure(text=result.message or "Test finished.")
        self._stop_button.configure(state="disabled", text="Cancel Test")
        restart_required = bool(self._runner and self._runner.restart_required)
        self._set_run_controls(not restart_required)
        self._export_text_button.configure(state="normal")
        self._export_json_button.configure(state="normal")
        self._set_result_text(render_result_text(result))
        self._refresh_gpu_install_button()
        if self._close_when_finished:
            self._destroy_window()

    def _set_run_controls(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        self._cpu_button.configure(state=state)
        if self._hardware.gpu is not None:
            self._gpu_button.configure(state=state)
        self._source_menu.configure(state=state)
        if self._gpu_install_button is not None:
            if gpu_runtime_status().installed:
                self._gpu_install_button.configure(state="disabled", text="GPU Support Installed")
            else:
                self._gpu_install_button.configure(
                    state=("normal" if enabled and not self._gpu_install_active else "disabled")
                )

    def _set_result_text(self, text: str) -> None:
        self._result_box.configure(state="normal")
        self._result_box.delete("1.0", "end")
        self._result_box.insert("1.0", text)
        self._result_box.configure(state="disabled")

    def _export(self, kind: str) -> None:
        result = self._result
        if result is None:
            return
        if kind == "json":
            extension = ".json"
            filetypes = [("JSON report", "*.json")]
            rendered = json.dumps(result.to_dict(), indent=2, sort_keys=True) + "\n"
        else:
            extension = ".txt"
            filetypes = [("Text report", "*.txt")]
            rendered = render_result_text(result) + "\n"

        filename = filedialog.asksaveasfilename(
            parent=self,
            title="Export Hearsay performance report",
            defaultextension=extension,
            filetypes=filetypes,
        )
        if not filename:
            return
        try:
            Path(filename).write_text(rendered, encoding="utf-8")
            self._status_label.configure(text=f"Report exported to {filename}")
        except OSError as exc:
            log.warning("Could not export diagnostics report", exc_info=True)
            self._status_label.configure(text=f"Could not export report: {exc}")

    def _close(self) -> None:
        if self._gpu_install_active:
            self._close_when_finished = True
            self._status_label.configure(
                text="Cancelling GPU support installation before closing..."
            )
            self._stop_button.configure(state="disabled")
            self._gpu_install_stop.set()
            return

        runner = self._runner
        if runner is not None and runner.is_active:
            self._close_when_finished = True
            self._status_label.configure(text="Cancelling test before closing...")
            self._stop_button.configure(state="disabled")
            runner.stop(cancelled=True)
            return
        self._destroy_window()

    def _destroy_window(self) -> None:
        try:
            self.grab_release()
        except Exception:
            pass
        self.destroy()
        if self._on_close_callback is not None:
            try:
                self._on_close_callback()
            except Exception:
                log.debug("Diagnostics parent close callback failed", exc_info=True)

    def _ui_call(self, callback: Callable[[], None]) -> None:
        try:
            self.after(0, callback)
        except Exception:
            log.debug("Diagnostics UI callback dropped after window close", exc_info=True)
