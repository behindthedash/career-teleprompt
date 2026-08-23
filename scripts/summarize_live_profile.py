"""Summarize content-free low-latency transcription metrics from a Hearsay log."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

# Allow direct execution from a source checkout without requiring an editable install.
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from hearsay.diagnostics.performance import (  # noqa: E402
    DiagnosticObservation,
    HostInfo,
    aggregate_observations,
    collect_host_info,
)

Observation = DiagnosticObservation

_START_RE = re.compile(
    r"Starting recording \(source=(?P<source>[^,]+), output_mode=(?P<output_mode>[^,]+), "
    r"profile=(?P<profile>[^,]+), cadence=(?P<chunk>[0-9.]+)s/(?P<overlap>[0-9.]+)s\)"
)
_MODEL_RE = re.compile(
    r"Loading model '(?P<model>[^']+)' \(device=(?P<device>[^,]+), compute=(?P<compute>[^)]+)\)"
)
_METRIC_RE = re.compile(
    r"Transcription health profile=(?P<profile>\S+) chunk=(?P<chunk>\d+) "
    r"audio=(?P<audio>[0-9.]+)s elapsed=(?P<elapsed>[0-9.]+)s "
    r"rtf=(?P<rtf>[0-9.]+)x backlog=(?P<backlog>\d+) health=(?P<health>\S+)"
)
_STOP_MARKER = "Stopping recording"


@dataclass
class ProfileSession:
    """One recording session reconstructed from application log boundaries."""

    index: int
    source: str
    output_mode: str
    profile_name: str
    chunk_duration_s: float
    overlap_duration_s: float
    model_name: str | None = None
    device: str | None = None
    compute_type: str | None = None
    stopped: bool = False
    observations: list[Observation] = field(default_factory=list)


@dataclass(frozen=True)
class ProfileSummary:
    """Aggregated live-profile measurements suitable for a validation report."""

    session_index: int
    source: str
    output_mode: str
    profile_name: str
    chunk_duration_s: float
    overlap_duration_s: float
    model_name: str | None
    device: str | None
    compute_type: str | None
    session_stopped: bool
    observation_count: int
    effective_audio_s: float
    processing_elapsed_s: float
    aggregate_rtf: float
    median_rtf: float
    p95_rtf: float
    max_rtf: float
    max_queue_depth: int
    healthy_observations: int
    behind_observations: int
    healthy_percent: float
    longest_behind_streak: int
    required_sample_s: float
    sample_target_met: bool
    host: HostInfo

    def to_dict(self) -> dict[str, object]:
        """Return a JSON-serializable representation."""
        data = asdict(self)
        data["effective_audio_minutes"] = round(self.effective_audio_s / 60.0, 3)
        return data


def parse_sessions(lines: Iterable[str]) -> list[ProfileSession]:
    """Reconstruct recording sessions while ignoring transcript-content log lines."""
    sessions: list[ProfileSession] = []
    current: ProfileSession | None = None

    for line in lines:
        start_match = _START_RE.search(line)
        if start_match:
            if current is not None:
                sessions.append(current)
            current = ProfileSession(
                index=len(sessions),
                source=start_match.group("source"),
                output_mode=start_match.group("output_mode"),
                profile_name=start_match.group("profile"),
                chunk_duration_s=float(start_match.group("chunk")),
                overlap_duration_s=float(start_match.group("overlap")),
            )
            continue

        if current is None:
            continue

        model_match = _MODEL_RE.search(line)
        if model_match:
            current.model_name = model_match.group("model")
            current.device = model_match.group("device")
            current.compute_type = model_match.group("compute")
            continue

        metric_match = _METRIC_RE.search(line)
        if metric_match and metric_match.group("profile") == current.profile_name:
            current.observations.append(
                Observation(
                    chunk_index=int(metric_match.group("chunk")),
                    audio_duration_s=float(metric_match.group("audio")),
                    processing_elapsed_s=float(metric_match.group("elapsed")),
                    realtime_factor=float(metric_match.group("rtf")),
                    queue_depth=int(metric_match.group("backlog")),
                    health=metric_match.group("health"),
                )
            )
            continue

        if _STOP_MARKER in line:
            # Teardown can still drain a final queued window after this line, so keep
            # the session open until the next start marker or end of file.
            current.stopped = True

    if current is not None:
        sessions.append(current)
    return sessions


def summarize_session(
    session: ProfileSession,
    *,
    minimum_sample_minutes: float = 3.0,
    host: HostInfo | None = None,
) -> ProfileSummary:
    """Aggregate one session using the shared in-app/offline metric definitions."""
    if minimum_sample_minutes <= 0:
        raise ValueError("minimum_sample_minutes must be greater than zero")
    if not session.observations:
        raise ValueError("session has no transcription metrics")

    aggregate = aggregate_observations(
        session.observations,
        required_sample_s=minimum_sample_minutes * 60.0,
    )
    return ProfileSummary(
        session_index=session.index,
        source=session.source,
        output_mode=session.output_mode,
        profile_name=session.profile_name,
        chunk_duration_s=session.chunk_duration_s,
        overlap_duration_s=session.overlap_duration_s,
        model_name=session.model_name,
        device=session.device,
        compute_type=session.compute_type,
        session_stopped=session.stopped,
        observation_count=aggregate.observation_count,
        effective_audio_s=aggregate.effective_audio_s,
        processing_elapsed_s=aggregate.processing_elapsed_s,
        aggregate_rtf=aggregate.aggregate_rtf,
        median_rtf=aggregate.median_rtf,
        p95_rtf=aggregate.p95_rtf,
        max_rtf=aggregate.max_rtf,
        max_queue_depth=aggregate.max_queue_depth,
        healthy_observations=aggregate.healthy_observations,
        behind_observations=aggregate.behind_observations,
        healthy_percent=aggregate.healthy_percent,
        longest_behind_streak=aggregate.longest_behind_streak,
        required_sample_s=aggregate.required_sample_s,
        sample_target_met=aggregate.sample_target_met,
        host=host or collect_host_info(),
    )


def render_text(summary: ProfileSummary) -> str:
    """Render a concise human-readable validation summary."""
    sample_state = "met" if summary.sample_target_met else "NOT MET"
    inference = "/".join(
        value or "unknown" for value in (summary.model_name, summary.device, summary.compute_type)
    )
    gpu = f"; NVIDIA={summary.host.nvidia_gpu}" if summary.host.nvidia_gpu else ""
    return "\n".join(
        [
            f"Live profile session #{summary.session_index}",
            (
                f"Profile: {summary.profile_name} "
                f"({summary.chunk_duration_s:g}s/{summary.overlap_duration_s:g}s), "
                f"source={summary.source}, output={summary.output_mode}"
            ),
            f"Inference: {inference}",
            (
                f"Host: {summary.host.system} {summary.host.release} "
                f"{summary.host.machine}; CPU={summary.host.processor or 'unknown'}{gpu}"
            ),
            (
                f"Sample: {summary.effective_audio_s / 60.0:.2f} min across "
                f"{summary.observation_count} observations; target "
                f"{summary.required_sample_s / 60.0:.2f} min = {sample_state}"
            ),
            (
                f"RTF: aggregate={summary.aggregate_rtf:.2f}x, "
                f"median={summary.median_rtf:.2f}x, p95={summary.p95_rtf:.2f}x, "
                f"max={summary.max_rtf:.2f}x"
            ),
            (
                f"Backlog: max={summary.max_queue_depth}; healthy="
                f"{summary.healthy_observations}/{summary.observation_count} "
                f"({summary.healthy_percent:.1f}%); behind={summary.behind_observations}; "
                f"longest behind streak={summary.longest_behind_streak}"
            ),
            f"Session stop observed: {'yes' if summary.session_stopped else 'no'}",
        ]
    )


def _default_log_path() -> Path | None:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    log_dir = Path(appdata) / "Hearsay" / "logs"
    candidates = sorted(log_dir.glob("hearsay_*.log"), reverse=True)
    return candidates[0] if candidates else None


def _select_live_sessions(sessions: list[ProfileSession]) -> list[ProfileSession]:
    return [
        session for session in sessions if session.profile_name == "live" and session.observations
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Summarize content-free Hearsay live-profile metrics from an application log."
    )
    parser.add_argument(
        "log",
        nargs="?",
        type=Path,
        help="Hearsay log file (defaults to the newest %%APPDATA%%/Hearsay/logs/hearsay_*.log).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Report every live session with metrics instead of only the latest one.",
    )
    parser.add_argument(
        "--minimum-sample-minutes",
        type=float,
        default=3.0,
        help="Minimum effective-audio duration required to mark a profiling sample complete.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    parser.add_argument("--output", type=Path, help="Write the report to this path.")
    args = parser.parse_args()

    log_path = args.log or _default_log_path()
    if log_path is None:
        parser.error("no log path supplied and no default Hearsay log was found")
    if not log_path.is_file():
        parser.error(f"log file not found: {log_path}")

    sessions = parse_sessions(log_path.read_text(encoding="utf-8", errors="replace").splitlines())
    live_sessions = _select_live_sessions(sessions)
    if not live_sessions:
        parser.error("no live-profile transcription metrics found in the selected log")

    selected = live_sessions if args.all else [live_sessions[-1]]
    host = collect_host_info()
    summaries = [
        summarize_session(
            session,
            minimum_sample_minutes=args.minimum_sample_minutes,
            host=host,
        )
        for session in selected
    ]

    if args.json:
        payload: object = [summary.to_dict() for summary in summaries]
        if not args.all:
            payload = summaries[0].to_dict()
        rendered = json.dumps(payload, indent=2, sort_keys=True)
    else:
        rendered = "\n\n".join(render_text(summary) for summary in summaries)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
