"""Pytest bridge for Hearsay's existing script-style regression tests."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
THIS_FILE = Path(__file__).resolve()


def test_regression_scripts() -> None:
    """Run every legacy test script and require a zero exit code."""
    scripts = sorted(
        path
        for path in TESTS_DIR.glob("test_*.py")
        if path.resolve() != THIS_FILE
    )
    assert scripts, "No regression scripts were discovered"

    for script in scripts:
        completed = subprocess.run(
            [sys.executable, str(script)],
            cwd=TESTS_DIR.parent,
            check=False,
        )
        assert completed.returncode == 0, f"{script.name} exited {completed.returncode}"
