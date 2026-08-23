"""Stable public finalized-transcript event and subscription contracts."""

from hearsay.events.models import TranscriptEvent, TranscriptSource
from hearsay.events.subscriptions import (
    SubscriptionDiagnostics,
    TranscriptHandler,
    TranscriptSubscription,
    register_transcript_handler,
)

__all__ = [
    "SubscriptionDiagnostics",
    "TranscriptEvent",
    "TranscriptHandler",
    "TranscriptSource",
    "TranscriptSubscription",
    "register_transcript_handler",
]


def __getattr__(name: str):
    """Preserve the legacy dispatcher export without loading host internals eagerly."""
    if name == "TranscriptEventDispatcher":
        from hearsay.events.dispatcher import TranscriptEventDispatcher

        return TranscriptEventDispatcher
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
