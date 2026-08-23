"""Generic finalized-transcript event primitives."""

from hearsay.events.dispatcher import TranscriptEventDispatcher
from hearsay.events.models import TranscriptEvent, TranscriptSource

__all__ = ["TranscriptEvent", "TranscriptEventDispatcher", "TranscriptSource"]
