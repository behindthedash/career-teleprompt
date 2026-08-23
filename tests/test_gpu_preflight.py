"""Regression coverage for isolated GPU diagnostic preflight helpers."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

# The repository's legacy regression gate executes each test file directly, so
# project imports intentionally follow the source-path setup above.
# ruff: noqa: E402
from hearsay.diagnostics.gpu_preflight import _describe_failure, build_gpu_preflight_command


def test_frozen_gpu_preflight_command_reuses_packaged_executable() -> None:
    command = build_gpu_preflight_command(
        "turbo",
        "float16",
        executable=r"C:\Program Files\Hearsay\Hearsay.exe",
        frozen=True,
    )

    assert command == [
        r"C:\Program Files\Hearsay\Hearsay.exe",
        "--gpu-preflight",
        "turbo",
        "float16",
    ]


def test_source_gpu_preflight_command_uses_module_entrypoint() -> None:
    command = build_gpu_preflight_command(
        "turbo",
        "float16",
        executable=r"C:\Python311\python.exe",
        frozen=False,
    )

    assert command == [
        r"C:\Python311\python.exe",
        "-m",
        "hearsay",
        "--gpu-preflight",
        "turbo",
        "float16",
    ]


def test_cuda_library_failure_is_actionable() -> None:
    message = _describe_failure("Library cublas64_12.dll could not be loaded")

    assert "CUDA inference is not ready" in message
    assert "cuBLAS for CUDA 12" in message
    assert "cuDNN 9" in message
    assert "Install GPU Support" in message
    assert "cublas64_12.dll" in message


def test_unknown_preflight_failure_preserves_runtime_detail() -> None:
    message = _describe_failure("synthetic GPU failure")

    assert message == "GPU inference preflight failed: synthetic GPU failure"
