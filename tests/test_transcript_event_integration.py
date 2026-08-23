"""Integration regressions for finalized transcript events at the app drain boundary."""

from __future__ import annotations

import queue
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from hearsay.app import HearsayApp
from hearsay.constants import AUDIO_SOURCE_MIC, AUDIO_SOURCE_SYSTEM, LIVE_VIEW_POLL_MS
from hearsay.transcription.engine import TranscriptionResult


class RecordingDispatcher:
    def __init__(self) -> None:
        self.published: list[tuple[str, TranscriptionResult]] = []
        self.ended: list[str | None] = []

    def publish_result(self, session_id: str, result: TranscriptionResult) -> tuple[object, ...]:
        self.published.append((session_id, result))
        return ()

    def end_session(self, session_id: str | None) -> None:
        self.ended.append(session_id)


class RecordingWriter:
    def __init__(self) -> None:
        self.appended: list[TranscriptionResult] = []
        self.finalized: list[float | None] = []
        self.post_processed = False
        self.body_written = True

    def append(self, result: TranscriptionResult) -> None:
        self.appended.append(result)

    def finalize(self, total_duration: float | None = None) -> Path:
        self.finalized.append(total_duration)
        return Path("transcript.md")

    def post_process(self) -> None:
        self.post_processed = True


class RecordingLiveView:
    def __init__(self) -> None:
        self.lines: list[str] = []
        self.statuses: list[str] = []
        self.separators: list[str] = []

    def append_text(self, text: str) -> None:
        self.lines.append(text)

    def set_status(self, status: str) -> None:
        self.statuses.append(status)

    def append_separator(self, label: str) -> None:
        self.separators.append(label)


class DeferredRoot:
    def __init__(self) -> None:
        self.calls: list[tuple[int, object, tuple[object, ...]]] = []

    def after(self, ms: int, callback, *args) -> None:
        self.calls.append((ms, callback, args))


class ImmediateRoot:
    def after(self, _ms: int, callback, *args) -> None:
        callback(*args)


def make_result() -> TranscriptionResult:
    return TranscriptionResult(
        text="Remote question Local answer",
        segments=[
            {
                "start": 1.5,
                "end": 2.5,
                "text": "Remote question",
                "source": AUDIO_SOURCE_SYSTEM,
            },
            {
                "start": 3.0,
                "end": 4.0,
                "text": "Local answer",
                "source": AUDIO_SOURCE_MIC,
            },
        ],
        language="en",
        language_probability=0.99,
        chunk_index=7,
        window_start=30.0,
    )


def test_poll_publishes_events_without_changing_writer_or_live_view_delivery() -> None:
    app = object.__new__(HearsayApp)
    result = make_result()
    transcript_queue: queue.Queue[TranscriptionResult] = queue.Queue()
    transcript_queue.put(result)

    dispatcher = RecordingDispatcher()
    writer = RecordingWriter()
    live_view = RecordingLiveView()
    root = DeferredRoot()

    app._recording = True
    app._transcript_queue = transcript_queue
    app._event_session_id = "current-session"
    app._event_dispatcher = dispatcher
    app._writer = writer
    app._live_view = live_view
    app._root = root

    app._poll_transcripts()

    assert dispatcher.published == [("current-session", result)]
    assert writer.appended == [result]
    assert live_view.lines == [
        "[0:31] [Remote] Remote question",
        "[0:33] [Local] Local answer",
    ]
    assert transcript_queue.empty()
    assert len(root.calls) == 1
    assert root.calls[0][0] == LIVE_VIEW_POLL_MS


def test_teardown_drains_against_originating_session_and_preserves_outputs() -> None:
    app = object.__new__(HearsayApp)
    result = make_result()
    transcript_queue: queue.Queue[TranscriptionResult] = queue.Queue()
    transcript_queue.put(result)

    dispatcher = RecordingDispatcher()
    writer = RecordingWriter()
    live_view = RecordingLiveView()

    app._event_dispatcher = dispatcher
    app._live_view = live_view
    app._root = ImmediateRoot()
    app._tray = None

    app._teardown_recording(
        recorder=None,
        pipeline=None,
        engine=None,
        writer=writer,
        start_time=None,
        transcript_queue=transcript_queue,
        event_session_id="originating-session",
    )

    assert dispatcher.published == [("originating-session", result)]
    assert dispatcher.ended == ["originating-session"]
    assert writer.appended == [result]
    assert writer.finalized == [None]
    assert writer.post_processed
    assert live_view.lines == [
        "[0:31] [Remote] Remote question",
        "[0:33] [Local] Local answer",
    ]
    assert live_view.statuses[-1] == "Idle"
    assert len(live_view.separators) == 1
    assert transcript_queue.empty()
