"""Session-scoped creation of finalized transcript events."""

from __future__ import annotations

import threading
import uuid

from hearsay.constants import AUDIO_SOURCE_MIC, AUDIO_SOURCE_SYSTEM
from hearsay.events.models import TranscriptEvent, TranscriptSource
from hearsay.transcription.engine import TranscriptionResult


_SOURCE_MAP = {
    AUDIO_SOURCE_SYSTEM: TranscriptSource.REMOTE,
    AUDIO_SOURCE_MIC: TranscriptSource.LOCAL,
}


class TranscriptEventDispatcher:
    """Create ordered immutable events without retaining transcript content.

    Subscriber delivery is intentionally added by a later OpenSpec change. This
    slice owns finalized event creation, session identity, ordering, and stale
    session rejection only.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._next_sequence_by_session: dict[str, int] = {}

    def start_session(self) -> str:
        """Allocate a unique session identity with sequence numbering at zero."""
        session_id = uuid.uuid4().hex
        with self._lock:
            self._next_sequence_by_session[session_id] = 0
        return session_id

    def end_session(self, session_id: str | None) -> None:
        """Invalidate a session so delayed work cannot be relabeled or emitted."""
        if session_id is None:
            return
        with self._lock:
            self._next_sequence_by_session.pop(session_id, None)

    def publish_result(
        self,
        session_id: str,
        result: TranscriptionResult,
    ) -> tuple[TranscriptEvent, ...]:
        """Create one event for every finalized, source-labeled segment.

        Returns an empty tuple for a session that has already ended. This makes
        delayed prior-session results harmless while allowing teardown to drain
        and publish against the explicit session that produced them.
        """
        with self._lock:
            sequence = self._next_sequence_by_session.get(session_id)
            if sequence is None:
                return ()

            events: list[TranscriptEvent] = []
            for segment in result.segments:
                source = _SOURCE_MAP.get(segment.get("source"))
                if source is None:
                    continue

                start = segment.get("start")
                end = segment.get("end")
                event = TranscriptEvent(
                    session_id=session_id,
                    sequence=sequence,
                    chunk_index=result.chunk_index,
                    source=source,
                    text=str(segment.get("text", "")),
                    start_time=(
                        result.window_start + float(start)
                        if start is not None
                        else None
                    ),
                    end_time=(
                        result.window_start + float(end)
                        if end is not None
                        else None
                    ),
                )
                events.append(event)
                sequence += 1

            self._next_sequence_by_session[session_id] = sequence
            return tuple(events)
