"""One-time cleanup used to establish the repository Ruff baseline."""

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    content = file_path.read_text(encoding="utf-8")
    if old not in content:
        raise RuntimeError(f"Expected text not found in {path}: {old!r}")
    file_path.write_text(content.replace(old, new), encoding="utf-8")


def main() -> None:
    replace("src/hearsay/ui/wizard.py", "from pathlib import Path\n", "")
    replace(
        "src/hearsay/ui/wizard.py",
        "from hearsay.config import AppConfig, ConfigManager\n",
        "from hearsay.config import ConfigManager\n",
    )
    replace(
        "src/hearsay/ui/wizard.py",
        "from hearsay.utils.paths import get_default_output_dir\n",
        "",
    )
    replace(
        "src/hearsay/ui/wizard.py",
        """        except Exception as e:\n            log.error(\"Model download failed\", exc_info=True)\n            self.after(0, lambda: self._dl_status.configure(\n                text=f\"Download failed: {e}\", text_color=\"red\"\n            ))\n""",
        """        except Exception as exc:\n            log.error(\"Model download failed\", exc_info=True)\n            error_message = f\"Download failed: {exc}\"\n            self.after(\n                0,\n                lambda message=error_message: self._dl_status.configure(\n                    text=message, text_color=\"red\"\n                ),\n            )\n""",
    )

    for import_line in (
        "from hearsay.output.markdown_writer import MarkdownWriter",
        "from hearsay.transcription.engine import TranscriptionEngine",
        "from hearsay.transcription.pipeline import TranscriptionPipeline",
    ):
        replace(
            "scripts/manual_device_check.py",
            f"{import_line}\n",
            f"{import_line}  # noqa: E402\n",
        )

    replace(
        "tests/test_pipeline_writer.py",
        "_noop_cb = lambda rate: (lambda *a: None)\n",
        """def _noop_cb(rate):\n    def callback(*args):\n        return None\n\n    return callback\n""",
    )

    subprocess.run(
        ["ruff", "check", "src", "tests", "scripts", "--fix"],
        cwd=ROOT,
        check=True,
    )
    subprocess.run(["ruff", "format", "src", "tests", "scripts"], cwd=ROOT, check=True)
    subprocess.run(["ruff", "check", "src", "tests", "scripts"], cwd=ROOT, check=True)
    subprocess.run(
        ["ruff", "format", "--check", "src", "tests", "scripts"],
        cwd=ROOT,
        check=True,
    )


if __name__ == "__main__":
    main()
