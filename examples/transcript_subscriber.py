"""Minimal in-process consumer for Hearsay finalized transcript events.

Call ``install_example_handler`` from the same Python process that runs Hearsay.
This registration API is intentionally in-process; it is not a webhook or IPC
transport.
"""

from hearsay.events import (
    TranscriptEvent,
    TranscriptSource,
    TranscriptSubscription,
    register_transcript_handler,
)


def _print_remote_speech(event: TranscriptEvent) -> None:
    print(f"[{event.session_id}:{event.sequence}] {event.text}")


def install_example_handler() -> TranscriptSubscription:
    """Register a bounded Remote-only consumer and return its lifecycle handle."""
    return register_transcript_handler(
        name="example-remote-consumer",
        handler=_print_remote_speech,
        sources={TranscriptSource.REMOTE},
        queue_size=100,
    )
