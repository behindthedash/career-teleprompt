"""Regression coverage for Windows-safe faster-whisper model recovery."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

# The repository's legacy regression gate executes each test file directly, so
# project imports intentionally follow the source-path setup above.
# ruff: noqa: E402
from hearsay.transcription import model_manager


def _write_model_payload(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "config.json").write_text("{}", encoding="utf-8")
    (path / "model.bin").write_bytes(b"synthetic-model")


def _downloader(calls: list[Path]):
    def download(name: str, *, output_dir: str):
        assert name in {"small.en", "turbo"}
        target = Path(output_dir)
        calls.append(target)
        _write_model_payload(target)
        return str(target)

    return download


def test_legacy_huggingface_snapshot_is_not_considered_ready(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    legacy_snapshot = (
        model_root / "models--Systran--faster-whisper-small.en" / "snapshots" / "synthetic-revision"
    )
    _write_model_payload(legacy_snapshot)
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    assert model_manager.is_model_downloaded("small.en") is False


def test_materialized_model_is_considered_downloaded(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    _write_model_payload(model_root / "local-small.en")
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    assert model_manager.is_model_downloaded("small.en") is True


def test_load_materializes_model_and_uses_direct_local_path(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []
    factory_calls = []
    sentinel = object()

    def factory(model_path: str, **kwargs):
        path = Path(model_path)
        factory_calls.append((path, kwargs))
        assert path == model_root / "local-small.en"
        assert (path / "model.bin").is_file()
        assert "download_root" not in kwargs
        return sentinel

    loaded = model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        model_factory=factory,
        model_downloader=_downloader(downloads),
    )

    assert loaded is sentinel
    assert len(downloads) == 1
    assert downloads[0].name == ".local-small.en.download"
    assert len(factory_calls) == 1
    assert model_manager.is_model_downloaded("small.en") is True


def test_incomplete_materialized_model_is_replaced(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    target = model_root / "local-small.en"
    target.mkdir(parents=True)
    (target / "config.json").write_text("{}", encoding="utf-8")
    stale = target / "stale.txt"
    stale.write_text("partial", encoding="utf-8")
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []

    loaded = model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        model_factory=lambda *_args, **_kwargs: object(),
        model_downloader=_downloader(downloads),
    )

    assert loaded is not None
    assert len(downloads) == 1
    assert not stale.exists()
    assert (target / "model.bin").is_file()


def test_winerror_448_repairs_materialized_model_and_retries_once(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []
    statuses: list[str] = []
    calls = 0
    sentinel = object()

    def factory(model_path: str, **_kwargs):
        nonlocal calls
        calls += 1
        path = Path(model_path)
        if calls == 1:
            raise OSError(
                448,
                "The path cannot be traversed because it contains an untrusted mount point",
                str(path / "model.bin"),
            )
        assert path == model_root / "local-small.en"
        assert (path / "model.bin").is_file()
        return sentinel

    loaded = model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        status_callback=statuses.append,
        model_factory=factory,
        model_downloader=_downloader(downloads),
    )

    assert loaded is sentinel
    assert calls == 2
    assert len(downloads) == 2
    assert any("inaccessible" in status for status in statuses)
    assert statuses[-1] == "Model 'small.en' repaired and ready."


def test_repair_does_not_follow_error_path_outside_hearsay(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    outside = tmp_path / "outside-model"
    _write_model_payload(outside)
    keep = outside / "keep.txt"
    keep.write_text("do not delete", encoding="utf-8")
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []
    calls = 0

    def factory(_model_path: str, **_kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError(f"Unable to open file 'model.bin' in model '{outside}'")
        return object()

    model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        model_factory=factory,
        model_downloader=_downloader(downloads),
    )

    assert keep.read_text(encoding="utf-8") == "do not delete"
    assert calls == 2
    assert len(downloads) == 2


def test_nonrepairable_model_error_is_not_retried(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []
    calls = 0

    def factory(_model_path: str, **_kwargs):
        nonlocal calls
        calls += 1
        raise RuntimeError("CUDA out of memory")

    with pytest.raises(RuntimeError, match="CUDA out of memory"):
        model_manager.load_model_with_repair(
            "small.en",
            device="cpu",
            compute_type="int8",
            model_factory=factory,
            model_downloader=_downloader(downloads),
        )

    assert calls == 1
    assert len(downloads) == 1


def test_repair_attempt_does_not_loop_forever(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)
    downloads: list[Path] = []
    calls = 0

    def factory(model_path: str, **_kwargs):
        nonlocal calls
        calls += 1
        raise OSError(
            448,
            "The path cannot be traversed because it contains an untrusted mount point",
            str(Path(model_path) / "model.bin"),
        )

    with pytest.raises(RuntimeError, match="Automatic model repair failed"):
        model_manager.load_model_with_repair(
            "small.en",
            device="cpu",
            compute_type="int8",
            model_factory=factory,
            model_downloader=_downloader(downloads),
        )

    assert calls == 2
    assert len(downloads) == 2


def test_failed_download_does_not_promote_partial_model(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    def broken_download(_name: str, *, output_dir: str):
        staging = Path(output_dir)
        staging.mkdir(parents=True)
        (staging / "config.json").write_text("{}", encoding="utf-8")
        raise RuntimeError("network interrupted")

    with pytest.raises(RuntimeError, match="network interrupted"):
        model_manager.load_model_with_repair(
            "small.en",
            device="cpu",
            compute_type="int8",
            model_factory=lambda *_args, **_kwargs: object(),
            model_downloader=broken_download,
        )

    assert not (model_root / "local-small.en").exists()
    assert not (model_root / ".local-small.en.download").exists()
