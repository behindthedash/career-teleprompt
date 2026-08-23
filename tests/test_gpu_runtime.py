"""Regression coverage for Hearsay-managed NVIDIA GPU runtime installation."""

from __future__ import annotations

import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path
from threading import Event

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

# The repository's legacy regression gate executes each test file directly, so
# project imports intentionally follow the source-path setup above.
# ruff: noqa: E402
import hearsay.transcription.gpu_runtime as gpu_runtime
from hearsay.transcription.gpu_runtime import (
    GPUInstallCancelled,
    RuntimePackage,
    gpu_runtime_status,
    install_gpu_runtime,
)


class _Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False


def _runtime_wheel_bytes() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("nvidia/runtime/bin/cublas64_12.dll", b"synthetic cublas")
        archive.writestr("nvidia/runtime/bin/cudnn64_9.dll", b"synthetic cudnn")
        archive.writestr("synthetic.dist-info/licenses/License.txt", b"synthetic license")
    return output.getvalue()


def _configure_synthetic_runtime(monkeypatch, tmp_path, wheel_bytes: bytes) -> RuntimePackage:
    package = RuntimePackage(
        project="nvidia-synthetic-cu12",
        version="1.0.0",
        sha256=hashlib.sha256(wheel_bytes).hexdigest(),
        archive_prefix="nvidia/runtime/bin/",
    )
    monkeypatch.setattr(gpu_runtime, "RUNTIME_PACKAGES", (package,))
    monkeypatch.setattr(gpu_runtime, "_RUNTIME_ID", "synthetic-runtime")
    monkeypatch.setattr(gpu_runtime, "GPU_RUNTIME_MIN_FREE_BYTES", 0)
    monkeypatch.setattr(gpu_runtime, "get_gpu_runtime_dir", lambda: tmp_path)
    gpu_runtime._DLL_DIRECTORY_HANDLES.clear()
    return package


def _fake_urlopen(package: RuntimePackage, wheel_bytes: bytes, *, host="files.pythonhosted.org"):
    wheel_filename = "nvidia_synthetic_cu12-1.0.0-py3-none-win_amd64.whl"
    metadata = json.dumps(
        {
            "urls": [
                {
                    "filename": wheel_filename,
                    "url": f"https://{host}/packages/{wheel_filename}",
                    "size": len(wheel_bytes),
                    "digests": {"sha256": package.sha256},
                }
            ]
        }
    ).encode()

    def urlopen(request, timeout=0):
        del timeout
        url = getattr(request, "full_url", str(request))
        if url.startswith("https://pypi.org/"):
            return _Response(metadata)
        return _Response(wheel_bytes)

    return urlopen


def test_gpu_runtime_install_verifies_and_materializes_required_dlls(monkeypatch, tmp_path) -> None:
    wheel_bytes = _runtime_wheel_bytes()
    package = _configure_synthetic_runtime(monkeypatch, tmp_path, wheel_bytes)
    progress = []

    status = install_gpu_runtime(
        progress_callback=progress.append,
        urlopen=_fake_urlopen(package, wheel_bytes),
    )

    assert status.installed is True
    assert (status.bin_dir / "cublas64_12.dll").read_bytes() == b"synthetic cublas"
    assert (status.bin_dir / "cudnn64_9.dll").read_bytes() == b"synthetic cudnn"
    assert (status.runtime_dir / "licenses" / package.project / "License.txt").is_file()
    manifest = json.loads((status.runtime_dir / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["packages"][0]["sha256"] == package.sha256
    assert progress[-1].fraction == 1.0
    assert gpu_runtime_status().installed is True


def test_gpu_runtime_rejects_corrupt_download(monkeypatch, tmp_path) -> None:
    good_wheel = _runtime_wheel_bytes()
    package = _configure_synthetic_runtime(monkeypatch, tmp_path, good_wheel)
    corrupt_wheel = good_wheel + b"tampered"

    with pytest.raises(RuntimeError, match="SHA-256 verification failed"):
        install_gpu_runtime(
            urlopen=_fake_urlopen(package, corrupt_wheel),
        )

    assert gpu_runtime_status().installed is False


def test_gpu_runtime_rejects_unexpected_download_host(monkeypatch, tmp_path) -> None:
    wheel_bytes = _runtime_wheel_bytes()
    package = _configure_synthetic_runtime(monkeypatch, tmp_path, wheel_bytes)

    with pytest.raises(RuntimeError, match="Unexpected download host"):
        install_gpu_runtime(
            urlopen=_fake_urlopen(package, wheel_bytes, host="example.com"),
        )

    assert gpu_runtime_status().installed is False


def test_gpu_runtime_install_can_be_cancelled_before_network_access(monkeypatch, tmp_path) -> None:
    wheel_bytes = _runtime_wheel_bytes()
    package = _configure_synthetic_runtime(monkeypatch, tmp_path, wheel_bytes)
    stop_event = Event()
    stop_event.set()
    network_called = False

    def should_not_open(*args, **kwargs):
        nonlocal network_called
        network_called = True
        raise AssertionError("network should not be reached after cancellation")

    with pytest.raises(GPUInstallCancelled):
        install_gpu_runtime(stop_event=stop_event, urlopen=should_not_open)

    assert package.project == "nvidia-synthetic-cu12"
    assert network_called is False
    assert gpu_runtime_status().installed is False


def test_official_runtime_pins_match_expected_windows_components() -> None:
    packages = {package.project: package for package in gpu_runtime.RUNTIME_PACKAGES}

    assert packages["nvidia-cublas-cu12"].version == "12.9.2.10"
    assert packages["nvidia-cudnn-cu12"].version == "9.24.0.43"
    assert len(packages["nvidia-cublas-cu12"].sha256) == 64
    assert len(packages["nvidia-cudnn-cu12"].sha256) == 64
