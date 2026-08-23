"""Tests for generic persisted and live-only session output policy."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from hearsay.output.markdown_writer import MarkdownWriter
from hearsay.session import SessionOutputMode, create_session_writer


def test_live_only_does_not_construct_writer_or_output_directory(tmp_path: Path) -> None:
    output_dir = tmp_path / "live-only"

    writer = create_session_writer(output_dir, SessionOutputMode.LIVE_ONLY)

    assert writer is None
    assert not output_dir.exists()


def test_persisted_output_remains_default(tmp_path: Path) -> None:
    output_dir = tmp_path / "persisted-default"

    writer = create_session_writer(output_dir)

    assert isinstance(writer, MarkdownWriter)
    assert output_dir.is_dir()


def test_explicit_persisted_output_constructs_writer(tmp_path: Path) -> None:
    output_dir = tmp_path / "persisted-explicit"

    writer = create_session_writer(output_dir, SessionOutputMode.PERSISTED)

    assert isinstance(writer, MarkdownWriter)
    assert output_dir.is_dir()
