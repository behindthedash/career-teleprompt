"""TranscriptionPipeline thread: consumes audio chunks, produces transcript text."""

from __future__ import annotations

import difflib
import logging
import queue
import string
import time
from collections.abc import Callable

from hearsay.audio.recorder import AudioChunk
from hearsay.constants import AUDIO_SOURCE_MIC, AUDIO_SOURCE_SYSTEM
from hearsay.transcription.engine import TranscriptionEngine, TranscriptionResult
from hearsay.utils.threading_utils import StoppableThread

log = logging.getLogger(__name__)


class TranscriptionPipeline(StoppableThread):
    """Consume audio windows and emit merged source-tagged transcript results."""

    _TAIL_WORD_COUNT = 15
    _MIN_MATCH_WORDS = 2
    _MIN_ECHO_WORDS = 4
    _ECHO_MATCH_RATIO = 0.8

    def __init__(
        self,
        audio_queue: queue.Queue,
        transcript_queue: queue.Queue,
        engine: TranscriptionEngine,
        *,
        drain_on_stop: bool = True,
        on_error: Callable[[Exception], None] | None = None,
    ) -> None:
        super().__init__(name="TranscriptionPipeline")
        self.audio_queue = audio_queue
        self.transcript_queue = transcript_queue
        self.engine = engine
        self.drain_on_stop = drain_on_stop
        self.on_error = on_error
        self._prev_tails: dict[str, list[str]] = {}

    def run(self) -> None:
        log.info("TranscriptionPipeline started")
        while not self.stopped():
            try:
                chunk = self.audio_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            self._process_window(chunk)

        if self.drain_on_stop:
            # Normal persisted recording preserves the recorder's final flush.
            log.info("TranscriptionPipeline draining remaining audio chunks")
            while True:
                try:
                    chunk = self.audio_queue.get_nowait()
                except queue.Empty:
                    break
                self._process_window(chunk)
        else:
            # Diagnostics cancellation values prompt recovery over tail fidelity.
            # Never execute additional native inference after cancellation.
            discarded = 0
            while True:
                try:
                    self.audio_queue.get_nowait()
                    discarded += 1
                except queue.Empty:
                    break
            if discarded:
                log.info("Discarded %d queued diagnostic audio windows on stop", discarded)

        log.info("TranscriptionPipeline stopped")

    def _process_window(self, chunk: AudioChunk) -> bool:
        """Transcribe one window; return whether inference completed successfully."""
        try:
            t0 = time.perf_counter()
            tagged_segments: list[dict] = []
            language: str | None = None
            language_probability = 0.0
            system_words: list[str] = []

            for source, audio in chunk.parts.items():
                result = self.engine.transcribe(audio, chunk_index=chunk.index)
                if not result.text:
                    continue
                if language is None:
                    language = result.language
                    language_probability = result.language_probability

                original_words = result.text.split()
                prev_tail = self._prev_tails.get(source, [])
                if prev_tail:
                    result = self._deduplicate(result, prev_tail)
                self._prev_tails[source] = original_words[-self._TAIL_WORD_COUNT :]
                if not result.text:
                    continue

                segments = [{**seg, "source": source} for seg in result.segments]
                if source == AUDIO_SOURCE_MIC and system_words:
                    segments = [
                        seg for seg in segments if not self._is_echo(seg["text"], system_words)
                    ]
                if source == AUDIO_SOURCE_SYSTEM:
                    system_words = self._normalized_words(result.text)
                tagged_segments.extend(segments)

            elapsed = time.perf_counter() - t0
            tagged_segments = [s for s in tagged_segments if s["text"].strip()]
            tagged_segments.sort(key=lambda s: s["start"])
            merged_text = " ".join(s["text"].strip() for s in tagged_segments)

            log.info(
                "Chunk %d transcribed in %.1fs: %s",
                chunk.index,
                elapsed,
                merged_text[:80] if merged_text else "(empty)",
            )
            if not tagged_segments:
                return True

            self.transcript_queue.put(
                TranscriptionResult(
                    text=merged_text,
                    segments=tagged_segments,
                    language=language or "en",
                    language_probability=language_probability,
                    chunk_index=chunk.index,
                    window_start=chunk.window_start,
                )
            )
            return True
        except Exception as exc:
            log.error("Transcription failed for chunk %d", chunk.index, exc_info=True)
            if self.on_error is not None:
                try:
                    self.on_error(exc)
                except Exception:
                    log.error("Transcription error callback failed", exc_info=True)
            return False

    @staticmethod
    def _normalize(word: str) -> str:
        """Strip leading/trailing punctuation for comparison."""
        return word.strip(string.punctuation)

    @classmethod
    def _normalized_words(cls, text: str) -> list[str]:
        return [w for w in (cls._normalize(t).lower() for t in text.split()) if w]

    def _is_echo(self, text: str, system_words: list[str]) -> bool:
        """True if *text* mostly repeats this window's system audio."""
        words = self._normalized_words(text)
        if len(words) < self._MIN_ECHO_WORDS or not system_words:
            return False
        matcher = difflib.SequenceMatcher(None, words, system_words, autojunk=False)
        matched = sum(block.size for block in matcher.get_matching_blocks())
        if matched / len(words) >= self._ECHO_MATCH_RATIO:
            log.debug("Dropped mic echo segment: %s", text[:60])
            return True
        return False

    def _deduplicate(
        self,
        result: TranscriptionResult,
        prev_tail: list[str],
    ) -> TranscriptionResult:
        """Remove overlapping prefix from *result* that duplicates the previous tail."""
        new_words = result.text.split()
        if len(new_words) < self._MIN_MATCH_WORDS:
            return result

        best = 0
        for length in range(self._MIN_MATCH_WORDS, min(len(prev_tail), len(new_words)) + 1):
            suffix = prev_tail[-length:]
            prefix = new_words[:length]
            tail = [self._normalize(w).lower() for w in suffix]
            head = [self._normalize(w).lower() for w in prefix]
            first_ok = tail[0] == head[0] or (len(head[0]) >= 3 and tail[0].endswith(head[0]))
            if first_ok and tail[1:] == head[1:]:
                best = length

        if best == 0:
            return result

        stripped_words = new_words[best:]
        log.info(
            "Chunk %d: stripped %d overlapping words: %s",
            result.chunk_index,
            best,
            " ".join(new_words[:best]),
        )

        if not stripped_words:
            return TranscriptionResult(
                text="",
                segments=[],
                language=result.language,
                language_probability=result.language_probability,
                chunk_index=result.chunk_index,
            )

        new_text = " ".join(stripped_words)
        chars_removed = len(" ".join(new_words[:best])) + 1
        trimmed_segments = []
        for seg in result.segments:
            seg_text = seg["text"]
            if chars_removed >= len(seg_text):
                chars_removed -= len(seg_text) + 1
                continue
            if chars_removed > 0:
                seg = {**seg, "text": seg_text[chars_removed:].lstrip()}
                chars_removed = 0
            trimmed_segments.append(seg)

        return TranscriptionResult(
            text=new_text,
            segments=trimmed_segments if trimmed_segments else result.segments,
            language=result.language,
            language_probability=result.language_probability,
            chunk_index=result.chunk_index,
        )
