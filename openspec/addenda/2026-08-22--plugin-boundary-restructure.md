# Architecture Addendum — Split Consumer Product from Hearsay Host

**Date:** 2026-08-22

## Decision

Hearsay will remain a reusable transcription host. Interview-specific RAG, knowledge storage, cue generation, and teleprompter behavior will move to a separate consumer project rather than becoming Hearsay core.

## Host/Consumer Boundary

### Hearsay owns

- Windows system/microphone audio capture
- local faster-whisper transcription
- finalized source-tagged transcript event contract
- bounded/failure-isolated subscriber delivery
- generic live-only session output
- low-latency live transcription profiles and backlog diagnostics
- optional dependency isolation
- narrowly reusable topmost-window primitives
- upstream contribution discipline

### Interview Copilot owns

- remote-turn/question detection
- curated resume/project knowledge indexing
- local and PostgreSQL/pgvector knowledge-store providers
- retrieval/reranking and claim-status safeguards
- interview cue composition
- interview-specific overlay UX
- prepared teleprompter content and speech-following alignment
- coexistence of dynamic cues and prepared material
- end-to-end interview workflow/session orchestration

## Extension Model

The v1 contract is explicit in-process registration, conceptually:

```python
register_transcript_handler(handler)
```

The event payload remains generic. Hearsay does not know why a consumer wants transcript events.

A network webhook/WebSocket/IPC transport is intentionally deferred. It may be added later if process isolation becomes valuable, but it is not required to prove or support the first extension contract.

## Change Disposition

### Remain active in Hearsay

- 001 transcript event extension boundary
- 012 generic transcript subscriber API
- 013 generic live-only session mode
- 014 compact topmost window primitives
- 015 optional consumer dependency isolation
- 016 upstream contribution workflow
- 017 low-latency live transcription

### Extract to Interview Copilot

- 003 local knowledge index
- 004 remote question boundaries
- 005 interview cue retrieval
- 006 interview cue overlay
- 007 live interview copilot integration
- 008 teleprompter content model
- 009 local speech alignment
- 010 speech-following teleprompter UI
- 011 cue/teleprompter coexistence
- 018 knowledge-store provider backends

### Superseded

- 002 ephemeral copilot session — replaced by generic Hearsay change 013. The consumer should request/use Hearsay's live-only session capability instead of implementing persistence policy itself.

## Migration Package

Until `behindthedash/hearsay-interview-copilot` exists, extracted specs are preserved under `openspec/extractions/interview-copilot/`. That directory is not an active Hearsay OpenSpec change registry. Once the companion repository exists, its contents should be transplanted to that repository's root `openspec/` and rewritten where implementation paths still reference Hearsay internals.

## Dependency Direction

```text
hearsay-interview-copilot  --->  hearsay
             consumer              host
```

The dependency must never point back from Hearsay to Interview Copilot.
