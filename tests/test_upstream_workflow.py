"""Tests for non-destructive upstream sync and candidate contribution guardrails."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _load_script(name: str):
    path = ROOT / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


sync_upstream = _load_script("sync_upstream")
check_candidate = _load_script("check_upstream_candidate")


def _git(cwd: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr or completed.stdout
    return completed.stdout.strip()


def _configure_identity(repo: Path) -> None:
    _git(repo, "config", "user.name", "Hearsay CI")
    _git(repo, "config", "user.email", "hearsay-ci@example.invalid")


def _commit_file(repo: Path, relative_path: str, content: str, message: str) -> None:
    path = repo / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    _git(repo, "add", relative_path)
    _git(repo, "commit", "-m", message)


def test_sync_preview_then_apply_preserves_history(tmp_path: Path) -> None:
    upstream = tmp_path / "upstream"
    upstream.mkdir()
    _git(upstream, "init", "-b", "master")
    _configure_identity(upstream)
    _commit_file(upstream, "README.md", "upstream base\n", "upstream base")

    fork = tmp_path / "fork"
    _git(tmp_path, "clone", str(upstream), str(fork))
    _configure_identity(fork)
    _git(fork, "checkout", "-b", "dev")
    _commit_file(fork, "fork.txt", "fork only\n", "fork change")
    before_preview = _git(fork, "rev-parse", "HEAD")

    _commit_file(upstream, "upstream.txt", "new upstream\n", "upstream change")

    preview = sync_upstream.synchronize(
        remote="upstream",
        upstream_url=str(upstream),
        upstream_branch="master",
        target_branch="dev",
        configure_remote=True,
        apply=False,
        cwd=fork,
    )

    assert preview.applied is False
    assert preview.fork_only_commits == 1
    assert preview.upstream_only_commits == 1
    assert _git(fork, "rev-parse", "HEAD") == before_preview
    assert not (fork / "upstream.txt").exists()

    applied = sync_upstream.synchronize(
        remote="upstream",
        upstream_url=str(upstream),
        upstream_branch="master",
        target_branch="dev",
        apply=True,
        cwd=fork,
    )

    assert applied.applied is True
    assert (fork / "upstream.txt").read_text(encoding="utf-8") == "new upstream\n"
    assert len(_git(fork, "show", "-s", "--format=%P", "HEAD").split()) == 2


def test_sync_apply_refuses_dirty_worktree(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-b", "master")
    _configure_identity(repo)
    _commit_file(repo, "README.md", "base\n", "base")
    _git(repo, "checkout", "-b", "dev")
    _git(repo, "remote", "add", "upstream", str(repo))
    (repo / "README.md").write_text("dirty\n", encoding="utf-8")

    with pytest.raises(sync_upstream.SyncError, match="uncommitted changes"):
        sync_upstream.synchronize(
            remote="upstream",
            upstream_url=str(repo),
            upstream_branch="master",
            target_branch="dev",
            apply=True,
            cwd=repo,
        )


def test_candidate_path_guard_allows_generic_host_files() -> None:
    assert check_candidate.inspect_paths(
        ["src/hearsay/events/models.py", "tests/test_transcript_events.py", "docs/api.md"]
    ) == []


def test_candidate_path_guard_blocks_fork_private_and_transcript_artifacts() -> None:
    violations = check_candidate.inspect_paths(
        [
            "openspec/changes/example/tasks.md",
            "private/resume_notes.md",
            "fixtures/transcript_20260822.md",
            ".env",
        ]
    )
    kinds = {violation.kind for violation in violations}
    assert "fork-only-path" in kinds
    assert "consumer-path" in kinds
    assert "transcript-artifact" in kinds
    assert "credential-file" in kinds


def test_candidate_added_line_guard_blocks_consumer_dependencies_and_credentials() -> None:
    diff_text = """\
+++ b/src/hearsay/example.py
+from pgvector.psycopg import register_vector
+token = "sk-abcdefghijklmnopqrstuvwxyz"
+++ b/docs/example.md
+hearsay-interview-copilot integration detail
"""
    violations = check_candidate.inspect_added_lines(diff_text)
    kinds = {violation.kind for violation in violations}
    assert "consumer-dependency" in kinds
    assert "credential-like-content" in kinds
    assert "consumer-content" in kinds
