"""Download, validate, and self-heal cached faster-whisper models."""

from __future__ import annotations

import logging
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

from hearsay.constants import MODEL_TABLE
from hearsay.utils.paths import get_models_dir

log = logging.getLogger(__name__)

_REQUIRED_MODEL_FILES = ("config.json", "model.bin")
_REPAIRABLE_LOAD_ERRORS = (
    "unable to open file",
    "no such file or directory",
    "untrusted mount point",
    "path cannot be traversed",
)

ModelFactory = Callable[..., Any]
ModelDownloader = Callable[..., Any]


def list_available_models() -> list[str]:
    """Return all model names from the model table."""
    return list(MODEL_TABLE.keys())


def get_model_info(name: str) -> tuple[str, int, bool] | None:
    """Return (parameters, vram_gb, english_only) for a model, or None."""
    return MODEL_TABLE.get(name)


def is_model_downloaded(name: str) -> bool:
    """Return whether Hearsay has a complete materialized model directory.

    Hearsay intentionally does not treat Hugging Face snapshot-cache entries as
    ready-to-load models on Windows. Snapshot payloads can be reparse points or
    symlinks that Windows refuses to traverse with ``WinError 448``. A model is
    considered ready only after it has been materialized into Hearsay's own
    flat local model directory.
    """
    if name not in MODEL_TABLE:
        return False
    return _contains_model_payload(_materialized_model_dir(name, get_models_dir()))


def load_model_with_repair(
    name: str,
    *,
    device: str,
    compute_type: str,
    status_callback: Callable[[str], None] | None = None,
    model_factory: ModelFactory | None = None,
    model_downloader: ModelDownloader | None = None,
) -> Any:
    """Load a materialized faster-whisper model, repairing it once if needed.

    The model is downloaded to a temporary local directory and promoted only
    after the required CTranslate2 files are present. The resulting directory
    is then passed directly to ``WhisperModel`` so runtime inference never has
    to traverse Hugging Face snapshot cache mount points.
    """
    _validate_model_name(name)

    model_dir = get_models_dir()
    model_dir.mkdir(parents=True, exist_ok=True)
    local_model = _ensure_materialized_model(
        name,
        model_dir,
        status_callback=status_callback,
        model_downloader=model_downloader,
    )

    if model_factory is None:
        from faster_whisper import WhisperModel

        model_factory = WhisperModel

    def load_once() -> Any:
        return model_factory(
            str(local_model),
            device=device,
            compute_type=compute_type,
        )

    try:
        return load_once()
    except Exception as first_error:
        if not _is_repairable_load_error(first_error):
            raise

        log.warning(
            "Materialized model '%s' could not be traversed or loaded; repairing once",
            name,
            exc_info=True,
        )
        _notify(
            status_callback,
            f"Local model files are inaccessible — repairing '{name}'...",
        )
        _remove_materialized_model(name, model_dir)
        local_model = _ensure_materialized_model(
            name,
            model_dir,
            status_callback=status_callback,
            model_downloader=model_downloader,
        )

        try:
            model = load_once()
        except Exception as retry_error:
            raise RuntimeError(
                f"Automatic model repair failed for '{name}': {retry_error}"
            ) from retry_error

        _notify(status_callback, f"Model '{name}' repaired and ready.")
        return model


def download_model(
    name: str,
    progress_callback: Callable[[str], None] | None = None,
) -> str:
    """Download/materialize a model if needed and return its model name."""
    _validate_model_name(name)

    model_dir = get_models_dir()
    model_dir.mkdir(parents=True, exist_ok=True)
    _ensure_materialized_model(
        name,
        model_dir,
        status_callback=progress_callback,
    )
    return name


def _materialized_model_dir(name: str, model_dir: Path) -> Path:
    """Return Hearsay's flat, non-Hugging-Face-cache model directory."""
    return model_dir / f"local-{name}"


def _staging_model_dir(name: str, model_dir: Path) -> Path:
    return model_dir / f".local-{name}.download"


def _ensure_materialized_model(
    name: str,
    model_dir: Path,
    *,
    status_callback: Callable[[str], None] | None = None,
    model_downloader: ModelDownloader | None = None,
) -> Path:
    target = _materialized_model_dir(name, model_dir)
    if _contains_model_payload(target):
        return target

    if target.exists():
        _notify(status_callback, f"Incomplete local model detected — repairing '{name}'...")
        _remove_materialized_model(name, model_dir)

    staging = _staging_model_dir(name, model_dir)
    _remove_tree_best_effort(staging)

    if model_downloader is None:
        from faster_whisper.utils import download_model as faster_whisper_download_model

        model_downloader = faster_whisper_download_model

    _notify(
        status_callback,
        f"Downloading '{name}' into Windows-safe local model storage (this may take a few minutes)...",
    )
    log.info("Materializing model '%s' into %s", name, staging)

    try:
        model_downloader(name, output_dir=str(staging))
        if not _contains_model_payload(staging):
            missing = ", ".join(_missing_required_files(staging))
            raise RuntimeError(
                f"Downloaded model '{name}' is incomplete; missing required files: {missing}"
            )
        staging.replace(target)
    except Exception:
        _remove_tree_best_effort(staging)
        raise

    _notify(status_callback, f"Model '{name}' downloaded and ready.")
    log.info("Materialized model '%s' is ready at %s", name, target)
    return target


def _contains_model_payload(model_dir: Path) -> bool:
    """Check required files without following arbitrary cache directory paths."""
    try:
        return model_dir.is_dir() and not _missing_required_files(model_dir)
    except OSError:
        return False


def _missing_required_files(model_dir: Path) -> list[str]:
    missing: list[str] = []
    for filename in _REQUIRED_MODEL_FILES:
        try:
            if not (model_dir / filename).is_file():
                missing.append(filename)
        except OSError:
            missing.append(filename)
    return missing


def _is_repairable_load_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in _REPAIRABLE_LOAD_ERRORS)


def _remove_materialized_model(name: str, model_dir: Path) -> None:
    """Remove only the exact local model directory computed by Hearsay."""
    target = _materialized_model_dir(name, model_dir)
    expected_name = f"local-{name}"
    if target.parent != model_dir or target.name != expected_name:
        raise RuntimeError("Refusing to repair an unexpected model directory")

    if not target.exists():
        return

    try:
        shutil.rmtree(target)
    except OSError as exc:
        raise RuntimeError(f"Could not remove local model files for '{name}': {exc}") from exc

    log.info("Removed local materialized model for '%s': %s", name, target)


def _remove_tree_best_effort(path: Path) -> None:
    if not path.exists():
        return
    try:
        shutil.rmtree(path)
    except OSError:
        log.warning("Could not clean temporary model directory %s", path, exc_info=True)


def _validate_model_name(name: str) -> None:
    if name not in MODEL_TABLE:
        raise ValueError(f"Unknown model: {name}")


def _notify(callback: Callable[[str], None] | None, message: str) -> None:
    if callback is None:
        return
    try:
        callback(message)
    except Exception:
        log.debug("Model status callback failed", exc_info=True)
