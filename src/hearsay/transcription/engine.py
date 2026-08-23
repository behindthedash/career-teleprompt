"""TranscriptionEngine: wraps faster-whisper for inference."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

from hearsay.transcription.gpu_runtime import activate_gpu_runtime
from hearsay.transcription.model_manager import load_model_with_repair

log = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Result from transcribing one audio chunk."""

    text: str
    segments: list[dict]  # [{start, end, text, source?}, ...]
    language: str
    language_probability: float
    chunk_index: int
    window_start: float = 0.0  # wall-clock seconds since recording started


class TranscriptionEngine:
    """Wraps faster-whisper WhisperModel for inference."""

    def __init__(
        self,
        model_name: str = "small.en",
        device: str = "cpu",
        compute_type: str = "int8",
        language: str = "en",
        vad_filter: bool = True,
        status_callback: Callable[[str], None] | None = None,
    ) -> None:
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self.vad_filter = vad_filter
        self.status_callback = status_callback
        self._model = None

    def load(self) -> None:
        """Load the Whisper model into memory, repairing a broken cache once."""
        log.info(
            "Loading model '%s' (device=%s, compute=%s)",
            self.model_name,
            self.device,
            self.compute_type,
        )
        if self.device == "cuda":
            # Prefer Hearsay's optional app-local NVIDIA runtime when installed.
            # If absent, faster-whisper may still use a compatible system-wide
            # CUDA/cuDNN installation already present on the machine.
            activate_gpu_runtime()
        self._model = load_model_with_repair(
            self.model_name,
            device=self.device,
            compute_type=self.compute_type,
            status_callback=self.status_callback,
        )
        log.info("Model loaded successfully")

    def transcribe(
        self,
        audio: np.ndarray,
        chunk_index: int = 0,
    ) -> TranscriptionResult:
        """Transcribe a float32 16kHz mono audio array.

        Args:
            audio: Audio data as float32 numpy array at 16kHz.
            chunk_index: Index of this chunk (for ordering).

        Returns:
            TranscriptionResult with text and segment details.
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        segments_iter, info = self._model.transcribe(
            audio,
            beam_size=5,
            language=self.language if self.language else None,
            vad_filter=self.vad_filter,
            vad_parameters={"min_silence_duration_ms": 500},
        )

        segments = []
        texts = []
        for seg in segments_iter:
            segments.append(
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                }
            )
            texts.append(seg.text.strip())

        full_text = " ".join(texts)
        log.debug(
            "Chunk %d: %d segments, lang=%s (%.2f), text=%s",
            chunk_index,
            len(segments),
            info.language,
            info.language_probability,
            full_text[:100],
        )

        return TranscriptionResult(
            text=full_text,
            segments=segments,
            language=info.language,
            language_probability=info.language_probability,
            chunk_index=chunk_index,
        )

    def unload(self) -> None:
        """Free model memory."""
        self._model = None
        log.info("Model unloaded")
