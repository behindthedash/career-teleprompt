"""Generic finalized-transcript event and subscription primitives."""

from hearsay.events.dispatcher import TranscriptEventDispatcher
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
    "TranscriptEventDispatcher",
    "TranscriptHandler",
    "TranscriptSource",
    "TranscriptSubscription",
    "register_transcript_handler",
]
