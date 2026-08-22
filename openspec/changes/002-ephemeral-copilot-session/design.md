## Context

`HearsayApp._start_recording()` currently creates `MarkdownWriter` unconditionally before loading the Whisper model. `_poll_transcripts()` appends each drained result when a writer exists, and `_teardown_recording()` drains any remaining results into the writer before `finalize()` and `post_process()`. Raw audio is already never written to disk. The required privacy behavior therefore comes from making transcript persistence an explicit session policy rather than adding deletion after the fact.

## Goals / Non-Goals

**Goals:**
- Support a session that has full live transcription/event behavior but never creates a transcript file.
- Keep normal recording persisted by default.
- Make all stop/quit/failure paths honor the same immutable session output choice.

**Non-Goals:**
- No automatic deletion of pre-existing transcripts.
- No encrypted transcript storage.
- No interview-corpus/retrieval behavior.
- No change to logging beyond ensuring logs do not become a substitute full transcript store.

## Decisions

### D1. Represent output behavior as a session enum, not a mutable global toggle

Add a small `SessionOutputMode` value with at least `persist_transcript` and `live_only`. Capture the selected value at session start and pass/capture it through teardown. Do not repeatedly read a mutable settings field during the session.

### D2. Live-only mode never creates `MarkdownWriter`

Do not write and then delete a transcript. In live-only mode `_start_recording()` leaves the writer `None`; `_poll_transcripts()` still updates the live view and publishes transcript events. Teardown drains remaining transcript events to live consumers but has no writer to finalize.

This is easier to reason about and prevents crash remnants or deletion failures from violating the privacy contract.

### D3. Preserve default behavior

Normal tray recording paths continue to start with `persist_transcript` unless a caller explicitly requests live-only. A dedicated user-facing Interview Copilot start action is deferred to change 007; this change establishes and tests the output capability first.

### D4. Keep logs diagnostic, not transcript storage

Current pipeline logging includes only a short transcript preview. This change does not broaden log content. Tests should assert live-only mode does not introduce new full-text persistence paths. A future privacy-hardening change may reduce previews if needed, but it is not required to make transcript-file persistence optional.

### D5. Teardown captures the output policy with the session references

Just as teardown currently captures `writer`, `start_time`, and `transcript_queue` before clearing app state, it also captures the session output mode. This prevents a subsequent session or settings change from affecting the old session's finalization behavior.

## Risks / Trade-offs

- **A live-only session is unrecoverable after transcription failure.** This is consistent with Hearsay's existing no-audio-persistence design and intentional for privacy.
- **Diagnostic logs can contain short text excerpts.** Existing behavior remains; the change must not increase it. Full zero-text logging can be considered separately if the product requires it.
- **No user-facing selector yet.** Intentional sequencing: 007 will expose Interview Copilot mode after retrieval/cue components exist.

## Files Expected to Change

- `src/hearsay/session.py` or equivalent small session-output model
- `src/hearsay/app.py`
- `tests/test_ephemeral_session.py`
- optional config/settings files only if a persisted default is later deemed useful; not required for the first implementation

## Verification

Use a temporary output directory and synthetic transcript queue. Run equivalent persisted and live-only sessions; assert the first creates/finalizes markdown and the second does not create a file while both still deliver live/events. Repeat through normal stop, quit, and simulated fatal-recorder teardown.
