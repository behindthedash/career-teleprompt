"""Immutable transcript event models exposed by Hearsay."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TranscriptSource(str, Enum):
    """Consumer-facing source identity for finalized transcript speech."""

    REMOTE = "Remote"
    LOCAL = "Local"


@dataclass(frozen=True)
class TranscriptEvent:
    """One finalized transcript segment emitted for a recording session."""

    session_id: str
    sequence: int
    chunk_index: int
    source: TranscriptSource
    text: str
    start_time: float | None
    end_time: float | None
    final: bool = True
