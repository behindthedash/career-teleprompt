"""Install and activate optional NVIDIA runtime libraries for GPU inference.

Hearsay keeps the normal installer small. On Windows systems with a supported
NVIDIA GPU, users can explicitly install GPU support from inside the app. The
runtime is downloaded from NVIDIA's official PyPI packages, verified against
pinned SHA-256 hashes, and extracted into Hearsay's local application data.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import urllib.request
import zipfile
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Event
from typing import Any
from urllib.parse import urlparse

from hearsay.utils.paths import get_gpu_runtime_dir

log = logging.getLogger(__name__)

GPU_RUNTIME_DOWNLOAD_ESTIMATE_GB = 1.3
GPU_RUNTIME_MIN_FREE_BYTES = 4 * 1024**3
_REQUIRED_DLLS = ("cublas64_12.dll", "cudnn64_9.dll")
_DLL_DIRECTORY_HANDLES: list[Any] = []


@dataclass(frozen=True)
class RuntimePackage:
    """One pinned official NVIDIA Windows runtime wheel."""

    project: str
    version: str
    sha256: str
    archive_prefix: str

    @property
    def metadata_url(self) -> str:
        return f"https://pypi.org/pypi/{self.project}/{self.version}/json"


RUNTIME_PACKAGES = (
    RuntimePackage(
        project="nvidia-cublas-cu12",
        version="12.9.2.10",
        sha256="623f43027d40d44ceadf0043f002bd25cf353e8f13ce90b9a87057019f560661",
        archive_prefix="nvidia/cublas/bin/",
    ),
    RuntimePackage(
        project="nvidia-cudnn-cu12",
        version="9.24.0.43",
        sha256="cbd41a0ab084422c936dc9fb2fc89be5ea9a85bc421c6f23d0243bdfc945fbef",
        archive_prefix="nvidia/cudnn/bin/",
    ),
)
_RUNTIME_ID = "cuda12-cublas12.9.2.10-cudnn9.24.0.43"


@dataclass(frozen=True)
class GPURuntimeStatus:
    """Current state of Hearsay-managed GPU support."""

    installed: bool
    runtime_dir: Path
    bin_dir: Path
    missing_dlls: tuple[str, ...]


@dataclass(frozen=True)
class GPUInstallProgress:
    """Progress update for the normal-user GPU runtime installation flow."""

    message: str
    fraction: float | None = None


class GPUInstallCancelled(RuntimeError):
    """Raised when the user cancels an in-progress GPU runtime installation."""


def current_gpu_runtime_dir() -> Path:
    """Return the versioned runtime directory owned by the current Hearsay build."""
    return get_gpu_runtime_dir() / _RUNTIME_ID


def gpu_runtime_status() -> GPURuntimeStatus:
    """Return whether the pinned Hearsay GPU runtime is fully installed."""
    runtime_dir = current_gpu_runtime_dir()
    bin_dir = runtime_dir / "bin"
    missing = tuple(name for name in _REQUIRED_DLLS if not (bin_dir / name).is_file())
    manifest = runtime_dir / "manifest.json"
    installed = not missing and manifest.is_file()
    return GPURuntimeStatus(
        installed=installed,
        runtime_dir=runtime_dir,
        bin_dir=bin_dir,
        missing_dlls=missing,
    )


def activate_gpu_runtime() -> bool:
    """Add Hearsay-managed NVIDIA DLLs to this process and child-process PATH."""
    status = gpu_runtime_status()
    if not status.installed:
        return False
    if os.name != "nt":
        return False

    bin_text = str(status.bin_dir)
    path_entries = os.environ.get("PATH", "").split(os.pathsep)
    if bin_text.casefold() not in {entry.casefold() for entry in path_entries if entry}:
        os.environ["PATH"] = bin_text + os.pathsep + os.environ.get("PATH", "")

    # Python 3.8+ uses a restricted DLL search path on Windows. Keep the
    # returned handle alive for the lifetime of the process.
    add_dll_directory = getattr(os, "add_dll_directory", None)
    if add_dll_directory is not None and not any(
        getattr(handle, "path", None) == bin_text for handle in _DLL_DIRECTORY_HANDLES
    ):
        _DLL_DIRECTORY_HANDLES.append(add_dll_directory(bin_text))

    return True


def install_gpu_runtime(
    progress_callback: Callable[[GPUInstallProgress], None] | None = None,
    *,
    stop_event: Event | None = None,
    urlopen: Callable[..., Any] = urllib.request.urlopen,
) -> GPURuntimeStatus:
    """Download, verify, and atomically install the optional NVIDIA runtime."""
    if os.name != "nt":
        raise RuntimeError("Hearsay GPU runtime installation is supported only on Windows.")

    existing = gpu_runtime_status()
    if existing.installed:
        activate_gpu_runtime()
        _notify(progress_callback, "GPU support is already installed.", 1.0)
        return existing

    root = get_gpu_runtime_dir()
    free_bytes = shutil.disk_usage(root).free
    if free_bytes < GPU_RUNTIME_MIN_FREE_BYTES:
        required_gb = GPU_RUNTIME_MIN_FREE_BYTES / 1024**3
        available_gb = free_bytes / 1024**3
        raise RuntimeError(
            f"GPU support needs about {required_gb:.0f} GB of free disk space during setup; "
            f"only {available_gb:.1f} GB is available."
        )

    target = current_gpu_runtime_dir()
    staging = root / f".{_RUNTIME_ID}.installing"
    downloads = staging / "downloads"
    bin_dir = staging / "bin"
    licenses = staging / "licenses"

    _remove_tree_best_effort(staging)
    downloads.mkdir(parents=True, exist_ok=True)
    bin_dir.mkdir(parents=True, exist_ok=True)
    licenses.mkdir(parents=True, exist_ok=True)

    installed_packages: list[dict[str, object]] = []
    try:
        for package_index, package in enumerate(RUNTIME_PACKAGES):
            _check_cancelled(stop_event)
            wheel = _resolve_windows_wheel(package, urlopen=urlopen)
            wheel_path = downloads / str(wheel["filename"])
            base_fraction = package_index / len(RUNTIME_PACKAGES)
            span = 1.0 / len(RUNTIME_PACKAGES)
            _download_wheel(
                package,
                wheel,
                wheel_path,
                progress_callback=progress_callback,
                stop_event=stop_event,
                urlopen=urlopen,
                base_fraction=base_fraction,
                span=span * 0.85,
            )
            _check_cancelled(stop_event)
            _notify(
                progress_callback,
                f"Installing {package.project} {package.version}...",
                base_fraction + span * 0.9,
            )
            dll_count = _extract_runtime_payload(package, wheel_path, bin_dir, licenses)
            wheel_path.unlink(missing_ok=True)
            if dll_count == 0:
                raise RuntimeError(f"{package.project} wheel contained no Windows runtime DLLs.")
            installed_packages.append(
                {
                    "project": package.project,
                    "version": package.version,
                    "sha256": package.sha256,
                    "filename": wheel["filename"],
                    "dll_count": dll_count,
                }
            )

        missing = [name for name in _REQUIRED_DLLS if not (bin_dir / name).is_file()]
        if missing:
            raise RuntimeError(
                "NVIDIA runtime installation is incomplete; missing: " + ", ".join(missing)
            )

        manifest = {
            "runtime_id": _RUNTIME_ID,
            "installed_at_utc": datetime.now(timezone.utc).isoformat(),
            "source": "Official NVIDIA Windows wheels downloaded from PyPI",
            "packages": installed_packages,
        }
        (staging / "manifest.json").write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        shutil.rmtree(downloads, ignore_errors=True)

        _check_cancelled(stop_event)
        if target.exists():
            _remove_tree_best_effort(target)
        staging.replace(target)
        _cleanup_old_runtimes(root, keep=target)
    except Exception:
        _remove_tree_best_effort(staging)
        raise

    status = gpu_runtime_status()
    if not status.installed:
        raise RuntimeError("GPU support installation finished without a valid runtime.")
    activate_gpu_runtime()
    _notify(progress_callback, "GPU support installed successfully.", 1.0)
    return status


def _resolve_windows_wheel(
    package: RuntimePackage,
    *,
    urlopen: Callable[..., Any],
) -> dict[str, object]:
    request = urllib.request.Request(
        package.metadata_url,
        headers={"User-Agent": "Hearsay GPU Runtime Installer"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)

    for item in payload.get("urls", []):
        filename = str(item.get("filename", ""))
        digest = str(item.get("digests", {}).get("sha256", ""))
        if filename.endswith("-py3-none-win_amd64.whl") and digest == package.sha256:
            url = str(item.get("url", ""))
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.hostname != "files.pythonhosted.org":
                raise RuntimeError(f"Unexpected download host for {package.project}: {parsed.hostname}")
            return {
                "filename": filename,
                "url": url,
                "size": int(item.get("size") or 0),
            }

    raise RuntimeError(
        f"Could not find the pinned Windows wheel for {package.project} {package.version}."
    )


def _download_wheel(
    package: RuntimePackage,
    wheel: dict[str, object],
    destination: Path,
    *,
    progress_callback: Callable[[GPUInstallProgress], None] | None,
    stop_event: Event | None,
    urlopen: Callable[..., Any],
    base_fraction: float,
    span: float,
) -> None:
    request = urllib.request.Request(
        str(wheel["url"]),
        headers={"User-Agent": "Hearsay GPU Runtime Installer"},
    )
    expected_size = int(wheel.get("size") or 0)
    downloaded = 0
    digest = hashlib.sha256()

    _notify(
        progress_callback,
        f"Downloading {package.project} {package.version}...",
        base_fraction,
    )
    with urlopen(request, timeout=60) as response, destination.open("wb") as output:
        while True:
            _check_cancelled(stop_event)
            chunk = response.read(4 * 1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
            digest.update(chunk)
            downloaded += len(chunk)
            if expected_size > 0:
                ratio = min(1.0, downloaded / expected_size)
                _notify(
                    progress_callback,
                    f"Downloading {package.project}: {downloaded / 1024**2:.0f} / "
                    f"{expected_size / 1024**2:.0f} MB",
                    base_fraction + span * ratio,
                )

    if digest.hexdigest().lower() != package.sha256.lower():
        destination.unlink(missing_ok=True)
        raise RuntimeError(f"SHA-256 verification failed for {package.project}.")


def _extract_runtime_payload(
    package: RuntimePackage,
    wheel_path: Path,
    bin_dir: Path,
    licenses_dir: Path,
) -> int:
    dll_count = 0
    prefix = package.archive_prefix.casefold()
    with zipfile.ZipFile(wheel_path) as archive:
        for item in archive.infolist():
            normalized = item.filename.replace("\\", "/")
            lowered = normalized.casefold()
            if lowered.startswith(prefix) and lowered.endswith(".dll"):
                destination = bin_dir / Path(normalized).name
                with archive.open(item) as source, destination.open("wb") as output:
                    shutil.copyfileobj(source, output, length=4 * 1024 * 1024)
                dll_count += 1
            elif ".dist-info/licenses/" in lowered or lowered.endswith(("/license", "/license.txt")):
                destination = licenses_dir / package.project / Path(normalized).name
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source, destination.open("wb") as output:
                    shutil.copyfileobj(source, output)
    return dll_count


def _check_cancelled(stop_event: Event | None) -> None:
    if stop_event is not None and stop_event.is_set():
        raise GPUInstallCancelled("GPU support installation cancelled.")


def _notify(
    callback: Callable[[GPUInstallProgress], None] | None,
    message: str,
    fraction: float | None,
) -> None:
    if callback is None:
        return
    try:
        callback(
            GPUInstallProgress(
                message=message,
                fraction=max(0.0, min(1.0, fraction)) if fraction is not None else None,
            )
        )
    except Exception:
        log.debug("GPU runtime progress callback failed", exc_info=True)


def _cleanup_old_runtimes(root: Path, *, keep: Path) -> None:
    for child in root.iterdir():
        if child == keep or not child.is_dir() or not child.name.startswith("cuda12-"):
            continue
        _remove_tree_best_effort(child)


def _remove_tree_best_effort(path: Path) -> None:
    if not path.exists():
        return
    try:
        shutil.rmtree(path)
    except OSError:
        log.warning("Could not remove GPU runtime directory %s", path, exc_info=True)
