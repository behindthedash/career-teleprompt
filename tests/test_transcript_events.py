"""Fast logic tests for finalized transcript event creation."""

import sys
from dataclasses import FrozenInstanceError
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from hearsay.constants import AUDIO_SOURCE_MIC, AUDIO_SOURCE_SYSTEM
from hearsay.events import TranscriptEventDispatcher, TranscriptSource
from hearsay.transcription.engine import TranscriptionResult

FAILURES = []


def check(cond, msg):
    tag = "PASS" if cond else "FAIL"
    print(f"  [{tag}] {msg}")
    if not cond:
        FAILURES.append(msg)


def result(chunk_index, window_start, segments):
    return TranscriptionResult(
        text=" ".join(segment["text"] for segment in segments),
        segments=segments,
        language="en",
        language_probability=0.99,
        chunk_index=chunk_index,
        window_start=window_start,
    )


print("== TranscriptEventDispatcher session/order behavior ==")
dispatcher = TranscriptEventDispatcher()
session_a = dispatcher.start_session()

first = dispatcher.publish_result(
    session_a,
    result(
        7,
        30.0,
        [
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
    ),
)

check(len(first) == 2, "one event created per finalized source-labeled segment")
check(first[0].session_id == session_a == first[1].session_id, "session identity is stable")
check([event.sequence for event in first] == [0, 1], "sequence is monotonic within session")
check(first[0].source == TranscriptSource.REMOTE, "system audio maps to Remote")
check(first[1].source == TranscriptSource.LOCAL, "microphone maps to Local")
check(first[0].chunk_index == 7, "chunk index is retained")
check(
    first[0].start_time == 31.5 and first[0].end_time == 32.5,
    "timing is session-relative",
)
check(all(event.final for event in first), "events are finalized")

second = dispatcher.publish_result(
    session_a,
    result(
        8,
        60.0,
        [{"start": 0.25, "end": 1.0, "text": "Next", "source": AUDIO_SOURCE_SYSTEM}],
    ),
)
check([event.sequence for event in second] == [2], "sequence continues across results")

immutable = False
try:
    first[0].text = "mutated"
except FrozenInstanceError:
    immutable = True
check(immutable, "TranscriptEvent is immutable")

print("== TranscriptEventDispatcher session isolation ==")
session_b = dispatcher.start_session()
check(session_b != session_a, "new recording gets a distinct session identity")

b_events = dispatcher.publish_result(
    session_b,
    result(
        0,
        0.0,
        [{"start": 0.0, "end": 0.5, "text": "New session", "source": AUDIO_SOURCE_MIC}],
    ),
)
check(b_events[0].sequence == 0, "new session sequence restarts at zero")

# Ending A must make delayed work harmless without affecting the current B session.
dispatcher.end_session(session_a)
stale = dispatcher.publish_result(
    session_a,
    result(
        9,
        90.0,
        [{"start": 0.0, "end": 1.0, "text": "Stale", "source": AUDIO_SOURCE_SYSTEM}],
    ),
)
check(stale == (), "ended session rejects delayed prior-session work")

b_more = dispatcher.publish_result(
    session_b,
    result(
        1,
        30.0,
        [
            {
                "start": 1.0,
                "end": 2.0,
                "text": "Still current",
                "source": AUDIO_SOURCE_SYSTEM,
            }
        ],
    ),
)
check(b_more[0].sequence == 1, "ending another session does not disturb current ordering")

dispatcher.end_session(session_b)

print()
if FAILURES:
    print(f"{len(FAILURES)} FAILURE(S):")
    for failure in FAILURES:
        print(" -", failure)
    sys.exit(1)
print("ALL CHECKS PASSED")
