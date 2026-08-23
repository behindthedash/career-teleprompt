"""Regression coverage for incomplete faster-whisper cache recovery."""

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


def _hf_cache(model_root: Path, repo_dir: str, *, payload: bool) -> tuple[Path, Path]:
    cache = model_root / repo_dir
    snapshot = cache / "snapshots" / "synthetic-revision"
    snapshot.mkdir(parents=True)
    if payload:
        (snapshot / "model.bin").write_bytes(b"synthetic-model")
    return cache, snapshot


def test_is_model_downloaded_requires_model_payload(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    cache, snapshot = _hf_cache(
        model_root,
        "models--Systran--faster-whisper-small.en",
        payload=False,
    )
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    assert cache.exists()
    assert model_manager.is_model_downloaded("small.en") is False

    (snapshot / "model.bin").write_bytes(b"synthetic-model")
    assert model_manager.is_model_downloaded("small.en") is True


def test_turbo_cache_alias_is_recognized(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    _hf_cache(
        model_root,
        "models--mobiuslabsgmbh--faster-whisper-large-v3-turbo",
        payload=True,
    )
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    assert model_manager.is_model_downloaded("turbo") is True


def test_incomplete_cache_is_removed_before_model_load(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    cache, _ = _hf_cache(
        model_root,
        "models--Systran--faster-whisper-small.en",
        payload=False,
    )
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    calls = []
    statuses = []
    sentinel = object()

    def factory(*args, **kwargs):
        calls.append((args, kwargs))
        assert not cache.exists()
        return sentinel

    loaded = model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        status_callback=statuses.append,
        model_factory=factory,
    )

    assert loaded is sentinel
    assert len(calls) == 1
    assert any("Incomplete model cache detected" in status for status in statuses)


def test_missing_file_load_error_repairs_cache_and_retries_once(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    cache, snapshot = _hf_cache(
        model_root,
        "models--Systran--faster-whisper-small.en",
        payload=True,
    )
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    calls = []
    statuses = []
    sentinel = object()

    def factory(*args, **kwargs):
        calls.append((args, kwargs))
        if len(calls) == 1:
            raise RuntimeError(
                f"Unable to open file 'tokenizer.json' in model '{snapshot}'"
            )
        assert not cache.exists()
        return sentinel

    loaded = model_manager.load_model_with_repair(
        "small.en",
        device="cpu",
        compute_type="int8",
        status_callback=statuses.append,
        model_factory=factory,
    )

    assert loaded is sentinel
    assert len(calls) == 2
    assert any("re-downloading" in status for status in statuses)
    assert statuses[-1] == "Model 'small.en' repaired and ready."


def test_load_error_outside_hearsay_cache_is_never_deleted(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    model_root.mkdir()
    outside = tmp_path / "outside-model"
    outside.mkdir()
    (outside / "keep.txt").write_text("do not delete", encoding="utf-8")
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    calls = 0

    def factory(*args, **kwargs):
        nonlocal calls
        calls += 1
        raise RuntimeError(f"Unable to open file 'model.bin' in model '{outside}'")

    with pytest.raises(RuntimeError, match="Unable to open file"):
        model_manager.load_model_with_repair(
            "small.en",
            device="cpu",
            compute_type="int8",
            model_factory=factory,
        )

    assert calls == 1
    assert (outside / "keep.txt").read_text(encoding="utf-8") == "do not delete"


def test_repair_attempt_does_not_loop_forever(monkeypatch, tmp_path) -> None:
    model_root = tmp_path / "models"
    _, snapshot = _hf_cache(
        model_root,
        "models--Systran--faster-whisper-small.en",
        payload=True,
    )
    monkeypatch.setattr(model_manager, "get_models_dir", lambda: model_root)

    calls = 0

    def factory(*args, **kwargs):
        nonlocal calls
        calls += 1
        raise RuntimeError(f"Unable to open file 'model.bin' in model '{snapshot}'")

    with pytest.raises(RuntimeError, match="Automatic model cache repair failed"):
        model_manager.load_model_with_repair(
            "small.en",
            device="cpu",
            compute_type="int8",
            model_factory=factory,
        )

    assert calls == 2
