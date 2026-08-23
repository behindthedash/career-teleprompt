"""Tests for generic persisted and live-only session output policy."""

from __future__ import annotations

import queue
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from hearsay.app import HearsayApp
from hearsay.constants import AUDIO_SOURCE_SYSTEM
from hearsay.events import TranscriptEventDispatcher
from hearsay.events.subscriptions import TranscriptSubscriptionManager
from hearsay.output.markdown_writer import MarkdownWriter
from hearsay.session import SessionOutputMode, create_session_writer
from hearsay.transcription.engine import TranscriptionResult


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


def test_live_only_poll_preserves_events_and_live_view(monkeypatch) -> None:
    manager = TranscriptSubscriptionManager()
    received = []
    delivered = threading.Event()

    def handler(event) -> None:
        received.append(event)
        delivered.set()

    subscription = manager.register(name="live-only-test", handler=handler)
    dispatcher = TranscriptEventDispatcher(subscription_manager=manager)
    session_id = dispatcher.start_session()

    transcript_queue = queue.Queue()
    transcript_queue.put(
        TranscriptionResult(
            text="Remote speech",
            segments=[
                {
                    "start": 0.0,
                    "end": 0.5,
                    "text": "Remote speech",
                    "source": AUDIO_SOURCE_SYSTEM,
                }
            ],
            language="en",
            language_probability=0.99,
            chunk_index=0,
            window_start=0.0,
        )
    )

    class LiveView:
        def __init__(self) -> None:
            self.lines = []

        def append_text(self, text: str) -> None:
            self.lines.append(text)

    app = HearsayApp.__new__(HearsayApp)
    app._recording = True
    app._event_session_id = session_id
    app._transcript_queue = transcript_queue
    app._event_dispatcher = dispatcher
    app._writer = None
    app._live_view = LiveView()
    app._root = object()

    monkeypatch.setattr("hearsay.app.safe_after", lambda *args, **kwargs: None)

    app._poll_transcripts()

    assert delivered.wait(timeout=1.0)
    assert [event.text for event in received] == ["Remote speech"]
    assert len(app._live_view.lines) == 1
    assert "Remote speech" in app._live_view.lines[0]

    app._recording = False
    dispatcher.end_session(session_id)
    subscription.close()
