"""Generic recording-session output policy."""

from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from hearsay.output.markdown_writer import MarkdownWriter


class SessionOutputMode(str, Enum):
    """Control whether Hearsay persists its own transcript for a session."""

    PERSISTED = "persisted"
    LIVE_ONLY = "live-only"


def create_session_writer(
    output_dir: str | Path,
    output_mode: SessionOutputMode = SessionOutputMode.PERSISTED,
) -> MarkdownWriter | None:
    """Create the session transcript writer only when persistence is enabled."""
    mode = SessionOutputMode(output_mode)
    if mode is SessionOutputMode.LIVE_ONLY:
        return None

    from hearsay.output.markdown_writer import MarkdownWriter

    return MarkdownWriter(output_dir)
