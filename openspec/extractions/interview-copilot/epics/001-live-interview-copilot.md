# Epic 001 — Live Interview Copilot

## Business Objective

Build a separate interview-assistance consumer that subscribes to live Hearsay transcript events and surfaces concise, truthful, provenance-preserving cues while the interview is happening.

The product should help the user recall relevant experience without turning Hearsay into an interview-specific application and without requiring generated scripts in the critical path.

## Host Dependencies

This project consumes, but does not own:

- Hearsay finalized source-tagged transcript subscriber API
- Hearsay generic live-only session mode
- Hearsay low-latency transcription profile
- Hearsay reusable topmost-window primitives where useful

The MVP integration is explicit in-process handler registration. No webhook/network transport is required.

## Architectural Principles

1. **Transcript events are the system boundary.** Do not reach into Hearsay's transcript queue, UI widgets, recorder, or Whisper internals.
2. **Retrieval before generation.** The MVP selects and presents relevant evidence; it does not generate a paragraph the user is expected to read.
3. **Truth status is first-class.** Implemented work, prototypes, design ideas, and target-role hypotheticals remain distinguishable throughout indexing, retrieval, and display.
4. **Personal data stays out of Git.** Real resume/project material and interview transcripts are external user-owned data.
5. **Knowledge storage is consumer-owned.** Local storage and PostgreSQL/pgvector are backends of the Interview Copilot knowledge layer, not Hearsay capabilities.
6. **Stale work cannot win.** New interviewer turns supersede older retrieval generations.
7. **Failure degrades locally.** Retrieval/UI/database failure must not terminate Hearsay transcription.

## Feature Decomposition

### 003 — Local Knowledge Index
Curated document/chunk ingestion, local embeddings, provenance, experience status, and local semantic retrieval.

### 018 — Knowledge Store Provider Backends
Provider-neutral consumer knowledge store with local and optional PostgreSQL/pgvector implementations.

### 004 — Remote Question Boundaries
Consume `Remote` Hearsay transcript events and assemble coherent interviewer turns/query candidates using deterministic heuristics and bounded state.

### 005 — Interview Cue Retrieval
Retrieve/rerank evidence, preserve truth status, suppress stale generations, and compose compact structured cues.

### 006 — Interview Cue Overlay
Present the current structured cue in a compact topmost interview-specific UI without stealing focus.

### 007 — Live Interview Copilot Integration
Own consumer startup/preflight, Hearsay subscription registration, knowledge-provider health, query/retrieval orchestration, cue lifecycle, and teardown.

## Non-Goals

- No audio capture or Whisper inference.
- No direct access to Hearsay internal queues/UI.
- No generalized personal-KB platform.
- No automatic retention of interview transcripts by default.
- No requirement for a cloud embedding/LLM provider.
- No long-form answer generator in the MVP critical path.

## Acceptance Journey

1. Interview Copilot starts and registers a handler against a supported Hearsay event API.
2. Hearsay emits finalized `Remote` speech from a low-latency live-only session.
3. The consumer assembles a coherent interviewer turn.
4. The turn is searched against the selected career/interview knowledge scope.
5. Relevant evidence is returned with provenance and truth status.
6. A concise cue appears near the webcam.
7. A newer interviewer turn supersedes stale retrieval/cue work.
8. Consumer failure does not stop Hearsay transcription.
9. Session teardown clears transient question/cue state and unregisters the handler.

## Dependencies

`003` and `018` establish knowledge storage/retrieval foundations. `004` depends on the Hearsay subscriber API. `005` depends on `003/018/004`; `006` depends on the cue model; `007` composes the system.
