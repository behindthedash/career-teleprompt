"""Safely fetch and optionally merge canonical upstream Hearsay history."""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

DEFAULT_REMOTE = "upstream"
DEFAULT_UPSTREAM_URL = "https://github.com/parkscloud/Hearsay.git"
DEFAULT_UPSTREAM_BRANCH = "master"
DEFAULT_TARGET_BRANCH = "dev"


class SyncError(RuntimeError):
    """Raised when a safe synchronization precondition is not satisfied."""


@dataclass(frozen=True)
class SyncStatus:
    """Summary of fork/upstream divergence after fetching upstream."""

    target_branch: str
    upstream_ref: str
    fork_only_commits: int
    upstream_only_commits: int
    applied: bool


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
        raise SyncError(f"git {' '.join(args)}: {detail}")
    return completed.stdout.strip()


def normalize_remote_url(url: str) -> str:
    """Normalize common GitHub remote URL spellings for comparison."""
    value = url.strip()
    if value.startswith("git@github.com:"):
        value = "https://github.com/" + value.removeprefix("git@github.com:")
    value = value.rstrip("/\\")
    if value.lower().endswith(".git"):
        value = value[:-4]
    return value.lower()


def _ensure_repository(*, cwd: Path | None = None) -> None:
    if _git(["rev-parse", "--is-inside-work-tree"], cwd=cwd) != "true":
        raise SyncError("current directory is not a Git worktree")


def _ensure_remote(
    remote: str,
    upstream_url: str,
    *,
    configure_remote: bool,
    cwd: Path | None = None,
) -> None:
    remotes = set(filter(None, _git(["remote"], cwd=cwd).splitlines()))
    if remote not in remotes:
        if not configure_remote:
            raise SyncError(
                f"remote {remote!r} is missing; rerun with --configure-remote to add it"
            )
        _git(["remote", "add", remote, upstream_url], cwd=cwd)
        return

    actual_url = _git(["remote", "get-url", remote], cwd=cwd)
    if normalize_remote_url(actual_url) != normalize_remote_url(upstream_url):
        raise SyncError(
            f"remote {remote!r} points to {actual_url!r}, expected {upstream_url!r}; "
            "fix it explicitly before synchronizing"
        )


def _worktree_is_clean(*, cwd: Path | None = None) -> bool:
    return not _git(["status", "--porcelain"], cwd=cwd)


def _current_branch(*, cwd: Path | None = None) -> str:
    return _git(["branch", "--show-current"], cwd=cwd)


def _divergence(
    target_branch: str,
    upstream_ref: str,
    *,
    cwd: Path | None = None,
) -> tuple[int, int]:
    output = _git(
        ["rev-list", "--left-right", "--count", f"{target_branch}...{upstream_ref}"],
        cwd=cwd,
    )
    left, right = output.split()
    return int(left), int(right)


def synchronize(
    *,
    remote: str = DEFAULT_REMOTE,
    upstream_url: str = DEFAULT_UPSTREAM_URL,
    upstream_branch: str = DEFAULT_UPSTREAM_BRANCH,
    target_branch: str = DEFAULT_TARGET_BRANCH,
    apply: bool = False,
    configure_remote: bool = False,
    cwd: Path | None = None,
) -> SyncStatus:
    """Fetch upstream and optionally merge it into the current target branch."""
    _ensure_repository(cwd=cwd)
    _ensure_remote(
        remote,
        upstream_url,
        configure_remote=configure_remote,
        cwd=cwd,
    )
    _git(["fetch", remote, upstream_branch, "--prune"], cwd=cwd)

    upstream_ref = f"{remote}/{upstream_branch}"
    fork_only, upstream_only = _divergence(target_branch, upstream_ref, cwd=cwd)

    if apply:
        current_branch = _current_branch(cwd=cwd)
        if current_branch != target_branch:
            raise SyncError(
                f"refusing merge on branch {current_branch!r}; expected {target_branch!r}"
            )
        if not _worktree_is_clean(cwd=cwd):
            raise SyncError("refusing merge because the worktree has uncommitted changes")
        _git(["merge", "--no-ff", "--no-edit", upstream_ref], cwd=cwd)

    return SyncStatus(
        target_branch=target_branch,
        upstream_ref=upstream_ref,
        fork_only_commits=fork_only,
        upstream_only_commits=upstream_only,
        applied=apply,
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remote", default=DEFAULT_REMOTE)
    parser.add_argument("--url", default=DEFAULT_UPSTREAM_URL, dest="upstream_url")
    parser.add_argument("--branch", default=DEFAULT_UPSTREAM_BRANCH, dest="upstream_branch")
    parser.add_argument("--target", default=DEFAULT_TARGET_BRANCH, dest="target_branch")
    parser.add_argument(
        "--configure-remote",
        action="store_true",
        help="add the upstream remote if it is missing; existing mismatched remotes are never rewritten",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="merge fetched upstream history into the current target branch",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        status = synchronize(
            remote=args.remote,
            upstream_url=args.upstream_url,
            upstream_branch=args.upstream_branch,
            target_branch=args.target_branch,
            apply=args.apply,
            configure_remote=args.configure_remote,
        )
    except SyncError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(
        f"{status.target_branch} vs {status.upstream_ref}: "
        f"fork-only={status.fork_only_commits}, upstream-only={status.upstream_only_commits}"
    )
    if status.applied:
        print(
            f"Merged {status.upstream_ref} into {status.target_branch} locally; nothing was pushed."
        )
    else:
        print("Preview only. Re-run with --apply to merge locally after reviewing the divergence.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
