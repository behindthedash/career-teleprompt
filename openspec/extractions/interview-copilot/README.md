# Interview Copilot Extraction Package

This directory preserves OpenSpec artifacts that no longer belong to Hearsay core.

It is intentionally **not** an active Hearsay OpenSpec change registry. The OpenSpec CLI should continue to operate on `openspec/config.yaml` and `openspec/changes/` at the repository root; it should not apply the changes staged here.

## Intended destination

`behindthedash/hearsay-interview-copilot`

When that repository exists, move this package's contents so that repository contains:

```text
openspec/
  README.md
  config.yaml
  epics/
  changes/
```

Then revise any remaining implementation paths from `src/hearsay/...` to the companion project's package paths before applying changes.

## Host dependency

The consumer depends on Hearsay capabilities rather than duplicating them:

- finalized source-tagged transcript subscriber API
- generic live-only session mode
- low-latency transcription profile
- side-effect-free supported Hearsay import surface

The intended runtime shape is:

```text
Hearsay
  audio -> Whisper -> TranscriptEventDispatcher
                          |
                          v
              Interview Copilot consumer
              question detection -> retrieval -> cue UI
```

The first integration should use explicit in-process registration. Network webhook/WebSocket/IPC transport can be considered later if process isolation becomes worth the complexity.

## Preserved changes

- 003 local knowledge index
- 004 remote question boundaries
- 005 interview cue retrieval
- 006 interview cue overlay
- 007 live interview copilot integration
- 008 teleprompter content model
- 009 local speech alignment
- 010 speech-following teleprompter UI
- 011 cue/teleprompter coexistence
- 014 compact topmost window primitives
- 018 knowledge-store provider backends

Change 002 is not moved because its responsibility is superseded by Hearsay's generic change 013.

The old Hearsay change 015 is not moved because its copilot-dependency framing is obsolete; the companion project simply owns its own dependency set while Hearsay change 015 guarantees a clean host import surface.
