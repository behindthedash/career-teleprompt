"""Isolated CUDA inference preflight for GPU diagnostics."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from dataclasses import dataclass
from threading import Event

GPU_PREFLIGHT_TIMEOUT_S = 30.0


@dataclass(frozen=True)
class GPUPreflightResult:
    """Outcome of the isolated CUDA inference preflight."""

    ok: bool
    message: str
    cancelled: bool = False


def build_gpu_preflight_command(
    model_name: str,
    compute_type: str,
    *,
    executable: str | None = None,
    frozen: bool | None = None,
) -> list[str]:
    """Build the command that executes preflight outside the UI process."""
    exe = executable or sys.executable
    is_frozen = bool(getattr(sys, "frozen", False)) if frozen is None else frozen
    args = ["--gpu-preflight", model_name, compute_type]
    if is_frozen:
        return [exe, *args]
    return [exe, "-m", "hearsay", *args]


def run_gpu_preflight(
    model_name: str,
    compute_type: str,
    *,
    stop_event: Event | None = None,
    timeout_s: float = GPU_PREFLIGHT_TIMEOUT_S,
    executable: str | None = None,
) -> GPUPreflightResult:
    """Run one real CUDA transcription in a killable child process."""
    if timeout_s <= 0:
        raise ValueError("timeout_s must be greater than zero")

    command = build_gpu_preflight_command(
        model_name,
        compute_type,
        executable=executable,
    )
    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        creationflags=creationflags,
    )
    deadline = time.monotonic() + timeout_s

    while process.poll() is None:
        if stop_event is not None and stop_event.is_set():
            process.kill()
            process.communicate()
            return GPUPreflightResult(
                ok=False,
                cancelled=True,
                message="GPU preflight cancelled.",
            )
        if time.monotonic() >= deadline:
            process.kill()
            stdout, stderr = process.communicate()
            detail = _preflight_detail(stdout, stderr)
            message = (
                f"GPU inference preflight timed out after {timeout_s:g}s. "
                "The CUDA runtime did not complete a short transcription."
            )
            if detail:
                message += f" Detail: {detail}"
            return GPUPreflightResult(ok=False, message=message)
        time.sleep(0.1)

    stdout, stderr = process.communicate()
    if process.returncode == 0:
        return GPUPreflightResult(ok=True, message="GPU inference preflight passed.")

    return GPUPreflightResult(
        ok=False,
        message=_describe_failure(_preflight_detail(stdout, stderr)),
    )


def _preflight_detail(stdout: str | None, stderr: str | None) -> str:
    detail = (stderr or stdout or "").strip()
    if not detail:
        return ""
    lines = [line.strip() for line in detail.splitlines() if line.strip()]
    return lines[-1][:600] if lines else ""


def _describe_failure(detail: str) -> str:
    lowered = detail.lower()
    runtime_markers = (
        "cublas",
        "cudnn",
        "cuda runtime",
        "cuda driver",
        "cannot be loaded",
        "could not load library",
        "library not found",
        "dll",
    )
    if any(marker in lowered for marker in runtime_markers):
        message = (
            "NVIDIA GPU detected, but CUDA inference is not ready. "
            "faster-whisper on Windows requires NVIDIA cuBLAS for CUDA 12 "
            "and cuDNN 9. Install those NVIDIA runtime libraries, restart Hearsay, "
            "and run the GPU test again."
        )
        if detail:
            message += f" Runtime detail: {detail}"
        return message

    if detail:
        return f"GPU inference preflight failed: {detail}"
    return "GPU inference preflight failed before live capture started."
