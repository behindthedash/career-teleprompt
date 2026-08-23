"""Bounded, failure-isolated delivery of finalized transcript events."""

from __future__ import annotations

import queue
import threading
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from hearsay.events.models import TranscriptEvent, TranscriptSource

TranscriptHandler = Callable[[TranscriptEvent], None]


@dataclass(frozen=True)
class SubscriptionDiagnostics:
    """Content-free health snapshot for one transcript subscription."""

    name: str
    delivered: int
    dropped: int
    failures: int
    last_failure_at: float | None
    last_failure_type: str | None
    closed: bool
    queued: int


class TranscriptSubscription:
    """Handle for one bounded transcript-event consumer."""

    def __init__(
        self,
        *,
        name: str,
        handler: TranscriptHandler,
        sources: frozenset[TranscriptSource] | None,
        queue_size: int,
        on_close: Callable[[str, "TranscriptSubscription"], None],
    ) -> None:
        self.name = name
        self._handler = handler
        self._sources = sources
        self._queue: queue.Queue[TranscriptEvent] = queue.Queue(maxsize=queue_size)
        self._on_close = on_close
        self._state_lock = threading.Lock()
        self._closed = False
        self._delivered = 0
        self._dropped = 0
        self._failures = 0
        self._last_failure_at: float | None = None
        self._last_failure_type: str | None = None
        self._stop = threading.Event()
        self._worker = threading.Thread(
            target=self._run,
            daemon=True,
            name=f"TranscriptSubscriber-{name}",
        )
        self._worker.start()

    def accepts(self, event: TranscriptEvent) -> bool:
        """Return whether this subscription accepts the event source."""
        return self._sources is None or event.source in self._sources

    def enqueue(self, event: TranscriptEvent) -> None:
        """Queue an event without blocking; drop the incoming event when full."""
        with self._state_lock:
            if self._closed:
                return

        try:
            self._queue.put_nowait(event)
        except queue.Full:
            with self._state_lock:
                if not self._closed:
                    self._dropped += 1

    def diagnostics(self) -> SubscriptionDiagnostics:
        """Return current counters without retaining transcript content."""
        with self._state_lock:
            return SubscriptionDiagnostics(
                name=self.name,
                delivered=self._delivered,
                dropped=self._dropped,
                failures=self._failures,
                last_failure_at=self._last_failure_at,
                last_failure_type=self._last_failure_type,
                closed=self._closed,
                queued=self._queue.qsize(),
            )

    def close(self) -> None:
        """Unregister this consumer and discard any queued undelivered events."""
        with self._state_lock:
            if self._closed:
                return
            self._closed = True

        self._on_close(self.name, self)
        self._stop.set()
        self._discard_queued_events()

        if threading.current_thread() is not self._worker:
            self._worker.join(timeout=1.0)

    unregister = close

    def _discard_queued_events(self) -> None:
        while True:
            try:
                self._queue.get_nowait()
            except queue.Empty:
                return
            else:
                self._queue.task_done()

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                event = self._queue.get(timeout=0.1)
            except queue.Empty:
                continue

            try:
                if self._stop.is_set():
                    continue
                self._handler(event)
            except Exception as exc:  # noqa: BLE001 - consumer failures are isolated by contract.
                with self._state_lock:
                    self._failures += 1
                    self._last_failure_at = time.time()
                    self._last_failure_type = type(exc).__name__
            else:
                with self._state_lock:
                    self._delivered += 1
            finally:
                self._queue.task_done()


class TranscriptSubscriptionManager:
    """Thread-safe registry and non-blocking publisher for transcript consumers."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subscriptions: dict[str, TranscriptSubscription] = {}

    def register(
        self,
        *,
        name: str,
        handler: TranscriptHandler,
        sources: Iterable[TranscriptSource | str] | None = None,
        queue_size: int = 100,
    ) -> TranscriptSubscription:
        """Register one named consumer and start its isolated delivery worker."""
        if not name.strip():
            raise ValueError("Subscription name must not be empty")
        if not callable(handler):
            raise TypeError("Transcript handler must be callable")
        if queue_size < 1:
            raise ValueError("queue_size must be at least 1")

        source_filter = _normalize_sources(sources)

        with self._lock:
            if name in self._subscriptions:
                raise ValueError(f"Transcript subscription already registered: {name}")
            subscription = TranscriptSubscription(
                name=name,
                handler=handler,
                sources=source_filter,
                queue_size=queue_size,
                on_close=self._remove,
            )
            self._subscriptions[name] = subscription

        return subscription

    def publish(self, event: TranscriptEvent) -> None:
        """Offer an event to matching subscribers without blocking the publisher."""
        with self._lock:
            subscriptions = tuple(self._subscriptions.values())

        for subscription in subscriptions:
            if subscription.accepts(event):
                subscription.enqueue(event)

    def _remove(self, name: str, subscription: TranscriptSubscription) -> None:
        with self._lock:
            if self._subscriptions.get(name) is subscription:
                self._subscriptions.pop(name, None)


def _normalize_sources(
    sources: Iterable[TranscriptSource | str] | None,
) -> frozenset[TranscriptSource] | None:
    if sources is None:
        return None
    return frozenset(
        source if isinstance(source, TranscriptSource) else TranscriptSource(source)
        for source in sources
    )


_DEFAULT_SUBSCRIPTION_MANAGER = TranscriptSubscriptionManager()


def get_default_subscription_manager() -> TranscriptSubscriptionManager:
    """Return the process-local manager used by Hearsay's default dispatcher."""
    return _DEFAULT_SUBSCRIPTION_MANAGER


def register_transcript_handler(
    name: str,
    handler: TranscriptHandler,
    *,
    sources: Iterable[TranscriptSource | str] | None = None,
    queue_size: int = 100,
) -> TranscriptSubscription:
    """Register a process-local finalized-transcript consumer.

    Delivery is in-process. The returned handle owns lifecycle and diagnostics;
    call ``close()``/``unregister()`` when the consumer no longer wants events.
    """
    return _DEFAULT_SUBSCRIPTION_MANAGER.register(
        name=name,
        handler=handler,
        sources=sources,
        queue_size=queue_size,
    )
