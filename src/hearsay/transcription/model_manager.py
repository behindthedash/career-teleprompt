"""Download, validate, and self-heal cached faster-whisper models."""

from __future__ import annotations

import logging
import re
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

from hearsay.constants import MODEL_TABLE
from hearsay.utils.paths import get_models_dir

log = logging.getLogger(__name__)

_MODEL_PATH_RE = re.compile(r"in model '([^']+)'")
_REPAIRABLE_LOAD_ERRORS = (
    "Unable to open file",
    "No such file or directory",
)


def list_available_models() -> list[str]:
    """Return all model names from the model table."""
    return list(MODEL_TABLE.keys())


def get_model_info(name: str) -> tuple[str, int, bool] | None:
    """Return (parameters, vram_gb, english_only) for a model, or None."""
    return MODEL_TABLE.get(name)


def is_model_downloaded(name: str) -> bool:
    """Return whether a complete CTranslate2 payload is cached locally.

    A Hugging Face cache directory can exist even when an interrupted download
    left the snapshot without ``model.bin``. Directory existence alone is not a
    valid completion signal.
    """
    if name not in MODEL_TABLE:
        return False
    model_dir = get_models_dir()
    return any(_contains_model_payload(path) for path in _candidate_cache_dirs(name, model_dir))


def load_model_with_repair(
    name: str,
    *,
    device: str,
    compute_type: str,
    status_callback: Callable[[str], None] | None = None,
    model_factory: Callable[..., Any] | None = None,
) -> Any:
    """Load a faster-whisper model, repairing a broken local cache once.

    Hearsay only removes cache directories that both match ``name`` and live
    directly beneath Hearsay's own model root. Paths supplied by arbitrary load
    errors are never deleted.
    """
    if name not in MODEL_TABLE:
        raise ValueError(f"Unknown model: {name}")

    model_dir = get_models_dir()
    model_dir.mkdir(parents=True, exist_ok=True)

    incomplete = _find_incomplete_cache(name, model_dir)
    if incomplete is not None:
        _notify(
            status_callback,
            f"Incomplete model cache detected — repairing '{name}'...",
        )
        _remove_cache_dir(incomplete, model_dir, name)

    if model_factory is None:
        from faster_whisper import WhisperModel

        model_factory = WhisperModel

    def load_once() -> Any:
        return model_factory(
            name,
            device=device,
            compute_type=compute_type,
            download_root=str(model_dir),
        )

    try:
        return load_once()
    except Exception as first_error:
        broken_cache = _repairable_cache_from_error(first_error, name, model_dir)
        if broken_cache is None:
            raise

        log.warning(
            "Model '%s' failed from an incomplete cache; removing %s and retrying once",
            name,
            broken_cache,
            exc_info=True,
        )
        _notify(
            status_callback,
            f"Model cache is incomplete — re-downloading '{name}'...",
        )
        _remove_cache_dir(broken_cache, model_dir, name)

        try:
            model = load_once()
        except Exception as retry_error:
            raise RuntimeError(
                f"Automatic model cache repair failed for '{name}': {retry_error}"
            ) from retry_error

        _notify(status_callback, f"Model '{name}' repaired and ready.")
        return model


def download_model(
    name: str,
    progress_callback: Callable[[str], None] | None = None,
) -> str:
    """Download a model if needed and return its faster-whisper model name."""
    if name not in MODEL_TABLE:
        raise ValueError(f"Unknown model: {name}")

    if progress_callback:
        progress_callback(f"Preparing model '{name}'...")

    model_dir = get_models_dir()
    log.info("Downloading/loading model '%s' to %s", name, model_dir)

    if progress_callback:
        progress_callback(f"Downloading '{name}' (this may take a few minutes)...")

    model = load_model_with_repair(
        name,
        device="cpu",
        compute_type="int8",
        status_callback=progress_callback,
    )
    del model

    if progress_callback:
        progress_callback(f"Model '{name}' ready!")

    log.info("Model '%s' is ready", name)
    return name


def _candidate_cache_dirs(name: str, model_dir: Path) -> list[Path]:
    candidates: list[Path] = []
    direct = model_dir / name
    if direct.exists():
        candidates.append(direct)

    if model_dir.exists():
        for path in model_dir.glob("models--*--*"):
            if path.is_dir() and _cache_dir_matches_model(path, name):
                candidates.append(path)
    return candidates


def _cache_dir_matches_model(path: Path, name: str) -> bool:
    if path.name == name:
        return True
    if not path.name.startswith("models--"):
        return False

    repo_name = path.name.split("--")[-1].lower()
    expected = {f"faster-whisper-{name}".lower()}
    if name == "turbo":
        expected.add("faster-whisper-large-v3-turbo")
    return repo_name in expected


def _contains_model_payload(cache_dir: Path) -> bool:
    if (cache_dir / "model.bin").is_file():
        return True

    snapshots = cache_dir / "snapshots"
    if not snapshots.is_dir():
        return False
    return any((snapshot / "model.bin").is_file() for snapshot in snapshots.iterdir() if snapshot.is_dir())


def _find_incomplete_cache(name: str, model_dir: Path) -> Path | None:
    for candidate in _candidate_cache_dirs(name, model_dir):
        if not _contains_model_payload(candidate):
            return candidate
    return None


def _repairable_cache_from_error(error: Exception, name: str, model_dir: Path) -> Path | None:
    message = str(error)
    if not any(marker in message for marker in _REPAIRABLE_LOAD_ERRORS):
        return None

    match = _MODEL_PATH_RE.search(message)
    if match is None:
        return None

    try:
        root = model_dir.resolve()
        failed_model_path = Path(match.group(1)).resolve()
        relative = failed_model_path.relative_to(root)
    except (OSError, ValueError):
        return None

    if not relative.parts:
        return None

    cache_root = root / relative.parts[0]
    if not _cache_dir_matches_model(cache_root, name):
        return None
    return cache_root


def _remove_cache_dir(cache_dir: Path, model_dir: Path, name: str) -> None:
    root = model_dir.resolve()
    candidate = cache_dir.resolve()
    try:
        relative = candidate.relative_to(root)
    except ValueError as exc:
        raise RuntimeError("Refusing to repair a model cache outside Hearsay's model directory") from exc

    if len(relative.parts) != 1 or not _cache_dir_matches_model(candidate, name):
        raise RuntimeError("Refusing to repair an unexpected model cache path")

    try:
        shutil.rmtree(candidate)
    except OSError as exc:
        raise RuntimeError(f"Could not remove incomplete model cache for '{name}': {exc}") from exc

    log.info("Removed incomplete model cache for '%s': %s", name, candidate)


def _notify(callback: Callable[[str], None] | None, message: str) -> None:
    if callback is None:
        return
    try:
        callback(message)
    except Exception:
        log.debug("Model status callback failed", exc_info=True)
