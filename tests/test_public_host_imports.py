"""Regression tests for Hearsay's supported extension-host import boundary."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def _run_probe(script: str) -> dict[str, object]:
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH")
    env["PYTHONPATH"] = str(SRC)
    if existing_pythonpath:
        env["PYTHONPATH"] += os.pathsep + existing_pythonpath
    env["PYTHONNOUSERSITE"] = "1"

    completed = subprocess.run(
        [sys.executable, "-c", textwrap.dedent(script)],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr or completed.stdout
    return json.loads(completed.stdout)


def test_supported_imports_do_not_start_application_components() -> None:
    probe = _run_probe(
        """
        import json
        import sys
        import threading

        before_threads = {thread.ident for thread in threading.enumerate()}

        from hearsay.events import (
            SubscriptionDiagnostics,
            TranscriptEvent,
            TranscriptHandler,
            TranscriptSource,
            TranscriptSubscription,
            register_transcript_handler,
        )
        from hearsay.host import (
            LIVE_TRANSCRIPTION_PROFILE,
            NORMAL_TRANSCRIPTION_PROFILE,
            SessionOutputMode,
            TranscriptionHealth,
            TranscriptionMetrics,
            TranscriptionProfile,
        )

        exports = (
            SubscriptionDiagnostics,
            TranscriptEvent,
            TranscriptHandler,
            TranscriptSource,
            TranscriptSubscription,
            register_transcript_handler,
            LIVE_TRANSCRIPTION_PROFILE,
            NORMAL_TRANSCRIPTION_PROFILE,
            SessionOutputMode,
            TranscriptionHealth,
            TranscriptionMetrics,
            TranscriptionProfile,
        )
        assert all(export is not None for export in exports)

        forbidden_prefixes = (
            "customtkinter",
            "pyaudiowpatch",
            "sounddevice",
            "faster_whisper",
            "pystray",
            "hearsay.app",
            "hearsay.audio",
            "hearsay.events.dispatcher",
            "hearsay.output",
            "hearsay.transcription.engine",
            "hearsay.transcription.pipeline",
            "hearsay.transcription.runtime",
            "hearsay.ui",
        )
        loaded_forbidden = sorted(
            name
            for name in sys.modules
            if any(
                name == prefix or name.startswith(prefix + ".")
                for prefix in forbidden_prefixes
            )
        )
        new_threads = sorted(
            thread.name
            for thread in threading.enumerate()
            if thread.ident not in before_threads
        )

        print(
            json.dumps(
                {
                    "loaded_forbidden": loaded_forbidden,
                    "new_threads": new_threads,
                }
            )
        )
        """
    )

    assert probe == {"loaded_forbidden": [], "new_threads": []}


def test_supported_imports_do_not_require_consumer_or_runtime_packages() -> None:
    probe = _run_probe(
        """
        import importlib.abc
        import json
        import sys

        blocked_roots = {
            "PIL",
            "anthropic",
            "customtkinter",
            "fastembed",
            "faster_whisper",
            "openai",
            "pgvector",
            "psycopg",
            "pyaudiowpatch",
            "pystray",
            "sounddevice",
        }

        class BlockedImportFinder(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path=None, target=None):
                if fullname.split(".", 1)[0] in blocked_roots:
                    raise ModuleNotFoundError(
                        f"blocked dependency imported by public host surface: {fullname}"
                    )
                return None

        sys.meta_path.insert(0, BlockedImportFinder())

        from hearsay.events import TranscriptEvent, register_transcript_handler
        from hearsay.host import LIVE_TRANSCRIPTION_PROFILE, SessionOutputMode

        assert TranscriptEvent is not None
        assert register_transcript_handler is not None
        assert LIVE_TRANSCRIPTION_PROFILE.name == "live"
        assert SessionOutputMode.LIVE_ONLY.value == "live-only"

        print(json.dumps({"ok": True}))
        """
    )

    assert probe == {"ok": True}
