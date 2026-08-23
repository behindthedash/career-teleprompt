"""Validate a narrow upstream candidate range for fork/private boundary violations."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Sequence

FORK_ONLY_PREFIXES = (".worktrail/", ".github/rulesets/", "openspec/")
BLOCKED_PATH_MARKERS = (
    "hearsay-interview-copilot",
    "interview-copilot",
    "personal-knowledge",
    "resume",
)
BLOCKED_FILE_NAMES = (
    ".env",
    "credentials.json",
    "credentials.yaml",
    "credentials.yml",
    "secrets.json",
    "secrets.yaml",
    "secrets.yml",
)
TRANSCRIPT_ARTIFACT_RE = re.compile(
    r"(?:^|/)(?:transcripts?/|transcript[_-](?:\d|private|real|meeting|session))",
    re.IGNORECASE,
)
CONSUMER_IMPORT_RE = re.compile(
    r"^\s*(?:from|import)\s+"
    r"(?:anthropic|fastembed|hearsay_interview_copilot|openai|pgvector|psycopg)(?:\.|\s|$)"
)
PRIVATE_KEY_RE = re.compile(r"-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----")
API_TOKEN_RE = re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b")
CREDENTIAL_ASSIGNMENT_RE = re.compile(
    r"\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]",
    re.IGNORECASE,
)
DOWNSTREAM_PRODUCT_RE = re.compile(
    r"\b(?:hearsay[-_]interview[-_]copilot|interview[-_]copilot)\b",
    re.IGNORECASE,
)


class CandidateCheckError(RuntimeError):
    """Raised when the candidate range cannot be inspected."""


@dataclass(frozen=True)
class Violation:
    """One actionable upstream-candidate policy violation."""

    kind: str
    detail: str
    path: str | None = None


def _git(args: Sequence[str], *, cwd: Path | None = None) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or "git command failed"
        raise CandidateCheckError(f"git {' '.join(args)}: {detail}")
    return completed.stdout


def inspect_paths(paths: Sequence[str]) -> list[Violation]:
    """Reject paths that are fork-only or likely to contain private artifacts."""
    violations: list[Violation] = []
    for path in paths:
        normalized = path.replace("\\", "/")
        lowered = normalized.lower()
        name = Path(normalized).name.lower()

        if lowered.startswith(FORK_ONLY_PREFIXES):
            violations.append(
                Violation(
                    kind="fork-only-path",
                    path=path,
                    detail="fork planning/repository policy metadata is not an upstream patch",
                )
            )
        if any(marker in lowered for marker in BLOCKED_PATH_MARKERS):
            violations.append(
                Violation(
                    kind="consumer-path",
                    path=path,
                    detail="path appears specific to a downstream/private consumer",
                )
            )
        if name in BLOCKED_FILE_NAMES:
            violations.append(
                Violation(
                    kind="credential-file",
                    path=path,
                    detail="credential/secret files must never be included in an upstream candidate",
                )
            )
        if TRANSCRIPT_ARTIFACT_RE.search(normalized):
            violations.append(
                Violation(
                    kind="transcript-artifact",
                    path=path,
                    detail="real transcript/session artifacts are not valid upstream fixtures",
                )
            )
    return violations


def inspect_added_lines(diff_text: str) -> list[Violation]:
    """Inspect only added diff lines for consumer dependencies and secret-like material."""
    violations: list[Violation] = []
    current_path: str | None = None

    for raw_line in diff_text.splitlines():
        if raw_line.startswith("+++ b/"):
            current_path = raw_line.removeprefix("+++ b/")
            continue
        if not raw_line.startswith("+") or raw_line.startswith("+++"):
            continue

        line = raw_line[1:]
        if CONSUMER_IMPORT_RE.search(line):
            violations.append(
                Violation(
                    kind="consumer-dependency",
                    path=current_path,
                    detail="downstream retrieval/database/LLM imports must remain outside Hearsay",
                )
            )
        if DOWNSTREAM_PRODUCT_RE.search(line):
            violations.append(
                Violation(
                    kind="consumer-content",
                    path=current_path,
                    detail="downstream Interview Copilot product content is not upstream-generic",
                )
            )
        credential_like = (
            PRIVATE_KEY_RE.search(line)
            or API_TOKEN_RE.search(line)
            or CREDENTIAL_ASSIGNMENT_RE.search(line)
        )
        if credential_like:
            violations.append(
                Violation(
                    kind="credential-like-content",
                    path=current_path,
                    detail="added line resembles a credential, API token, or private key",
                )
            )

    return violations


def inspect_candidate(
    base: str,
    head: str,
    *,
    cwd: Path | None = None,
) -> tuple[list[str], list[Violation]]:
    """Inspect one merge-base-relative Git range and return changed paths plus violations."""
    range_spec = f"{base}...{head}"
    names_output = _git(
        ["diff", "--name-only", "--diff-filter=ACMR", range_spec],
        cwd=cwd,
    )
    paths = [line.strip() for line in names_output.splitlines() if line.strip()]
    diff_text = _git(["diff", "--unified=0", "--no-color", range_spec], cwd=cwd)
    violations = inspect_paths(paths)
    violations.extend(inspect_added_lines(diff_text))
    return paths, violations


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="upstream/master")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--json", action="store_true", dest="json_output")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        paths, violations = inspect_candidate(args.base, args.head)
    except CandidateCheckError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.json_output:
        print(
            json.dumps(
                {
                    "base": args.base,
                    "head": args.head,
                    "changed_paths": paths,
                    "violations": [asdict(violation) for violation in violations],
                    "ok": not violations,
                },
                indent=2,
                sort_keys=True,
            )
        )
    elif violations:
        print(f"Upstream candidate rejected: {len(violations)} violation(s).")
        for violation in violations:
            location = f" [{violation.path}]" if violation.path else ""
            print(f"- {violation.kind}{location}: {violation.detail}")
    else:
        print(f"Upstream candidate guard passed for {len(paths)} changed path(s).")
        print("Manual privacy/product-boundary diff review is still required before submission.")

    return 1 if violations else 0


if __name__ == "__main__":
    raise SystemExit(main())
