"""Tests for bounded, failure-isolated transcript subscriptions."""

from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from hearsay.constants import AUDIO_SOURCE_MIC, AUDIO_SOURCE_SYSTEM
from hearsay.events import (
    TranscriptEventDispatcher,
    TranscriptSource,
    register_transcript_handler,
)
from hearsay.events.models import TranscriptEvent
from hearsay.events.subscriptions import TranscriptSubscriptionManager
from hearsay.transcription.engine import TranscriptionResult


def _wait_until(predicate, timeout: float = 2.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    raise AssertionError("Condition was not satisfied before timeout")


def _event(sequence: int, source: TranscriptSource = TranscriptSource.REMOTE) -> TranscriptEvent:
    return TranscriptEvent(
        session_id="session-a",
        sequence=sequence,
        chunk_index=sequence,
        source=source,
        text=f"event-{sequence}",
        start_time=float(sequence),
        end_time=float(sequence) + 0.5,
    )


def _result() -> TranscriptionResult:
    return TranscriptionResult(
        text="Remote Local",
        segments=[
            {
                "start": 0.0,
                "end": 0.5,
                "text": "Remote",
                "source": AUDIO_SOURCE_SYSTEM,
            },
            {
                "start": 0.5,
                "end": 1.0,
                "text": "Local",
                "source": AUDIO_SOURCE_MIC,
            },
        ],
        language="en",
        language_probability=0.99,
        chunk_index=0,
        window_start=0.0,
    )


def test_source_filter_and_dispatcher_integration() -> None:
    manager = TranscriptSubscriptionManager()
    received: list[TranscriptEvent] = []
    subscription = manager.register(
        name="remote-only",
        handler=received.append,
        sources={TranscriptSource.REMOTE},
    )
    dispatcher = TranscriptEventDispatcher(manager)

    try:
        session_id = dispatcher.start_session()
        dispatcher.publish_result(session_id, _result())
        _wait_until(lambda: len(received) == 1)

        assert received[0].source == TranscriptSource.REMOTE
        assert subscription.diagnostics().delivered == 1
    finally:
        subscription.close()


def test_failing_handler_is_isolated_from_other_subscribers() -> None:
    manager = TranscriptSubscriptionManager()
    healthy_received: list[TranscriptEvent] = []

    def failing_handler(event: TranscriptEvent) -> None:
        del event
        raise RuntimeError("consumer failure")

    failing = manager.register(name="failing", handler=failing_handler)
    healthy = manager.register(name="healthy", handler=healthy_received.append)

    try:
        manager.publish(_event(0))
        _wait_until(lambda: failing.diagnostics().failures == 1)
        _wait_until(lambda: len(healthy_received) == 1)

        diagnostics = failing.diagnostics()
        assert diagnostics.failures == 1
        assert diagnostics.last_failure_type == "RuntimeError"
        assert diagnostics.last_failure_at is not None
        assert healthy.diagnostics().delivered == 1
    finally:
        failing.close()
        healthy.close()


def test_slow_handler_overflow_drops_without_blocking_publisher() -> None:
    manager = TranscriptSubscriptionManager()
    handler_started = threading.Event()
    handler_release = threading.Event()

    def slow_handler(event: TranscriptEvent) -> None:
        del event
        handler_started.set()
        handler_release.wait(timeout=2.0)

    subscription = manager.register(
        name="slow",
        handler=slow_handler,
        queue_size=1,
    )

    try:
        manager.publish(_event(0))
        assert handler_started.wait(timeout=1.0)

        started_at = time.monotonic()
        manager.publish(_event(1))
        manager.publish(_event(2))
        elapsed = time.monotonic() - started_at

        assert elapsed < 0.2
        _wait_until(lambda: subscription.diagnostics().dropped >= 1)
    finally:
        handler_release.set()
        subscription.close()


def test_unregister_discards_queued_events_and_stops_future_delivery() -> None:
    manager = TranscriptSubscriptionManager()
    received: list[TranscriptEvent] = []
    subscription = manager.register(name="temporary", handler=received.append)

    manager.publish(_event(0))
    _wait_until(lambda: len(received) == 1)
    subscription.unregister()
    manager.publish(_event(1))
    time.sleep(0.05)

    assert len(received) == 1
    assert subscription.diagnostics().closed is True


def test_public_registration_api_uses_default_dispatcher_manager() -> None:
    received: list[TranscriptEvent] = []
    subscription = register_transcript_handler(
        "public-api-test",
        received.append,
        sources={"Remote"},
        queue_size=4,
    )
    dispatcher = TranscriptEventDispatcher()

    try:
        session_id = dispatcher.start_session()
        dispatcher.publish_result(session_id, _result())
        _wait_until(lambda: len(received) == 1)

        assert received[0].source == TranscriptSource.REMOTE
        assert received[0].text == "Remote"
    finally:
        subscription.close()
