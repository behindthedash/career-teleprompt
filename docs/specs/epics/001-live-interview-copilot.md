# Epic: Live Interview Copilot

**Epic ID:** 001-live-interview-copilot  
**Date:** 2026-08-22  
**Status:** Proposed  
**Product objective:** Extend Hearsay into a local-first interview copilot that listens to remote meeting audio, recognizes completed interviewer questions, retrieves the user's most relevant project/resume evidence, and displays concise answer cues near the webcam without replacing the user's own response.

## Business Objective

A candidate in a live Zoom/Teams interview should be able to stay engaged with the interviewer while a private local assistant continuously converts remote speech into text and surfaces the most relevant facts, projects, metrics, and talking points from a curated personal knowledge base.

The system should reduce recall pressure and improve answer organization without turning the interview into scripted reading. The candidate remains the speaker and decision-maker; the copilot provides compact context at the moment it is useful.

## Why This Epic Exists

Hearsay already solves the difficult Windows-native foundation:

- WASAPI loopback capture for system/remote audio;
- microphone capture as a separate source;
- local faster-whisper transcription;
- source-tagged `Remote` and `Local` transcript segments;
- a queue-based transcription pipeline;
- a live transcript UI;
- no persisted raw audio by design.

The missing product layer is what happens after a finalized remote transcript segment exists. Today it is rendered and written to a transcript. For an interview copilot, finalized remote speech should also be available to an extension pipeline that can detect useful query boundaries, retrieve relevant local knowledge, and update a low-distraction cue overlay.

This epic deliberately reuses Hearsay's audio and transcription core instead of replacing it with cloud speech APIs or a parallel recorder.

## Product Principle

> **Listen continuously; retrieve selectively; cue briefly; leave the answer to the user.**

The system should not generate a wall of prose for every transcript fragment. It should wait until enough interviewer intent is available, retrieve evidence only when useful, and display a small set of high-value cues that the candidate can absorb at a glance.

## Architectural Principles

### 1. Publish finalized transcript events from one stable boundary

Hearsay currently drains `TranscriptionResult` objects in the application polling boundary. Introduce a generic transcript-event publisher/subscriber seam so consumers can observe finalized source-tagged results without reading UI widgets or transcript files.

Representative event:

```text
TranscriptEvent
- session_id
- chunk_index
- source: remote | local
- text
- start_time
- end_time
- final: true
```

The first implementation may adapt existing `TranscriptionResult` segments rather than introduce a second transcription model.

### 2. Query only coherent remote utterances

Do not run retrieval on every Whisper chunk. Maintain a short-lived remote utterance buffer and trigger query formation when one of the following occurs:

- a question boundary is detected;
- remote speech pauses beyond a configurable threshold;
- a semantic intent shift is detected;
- the user manually requests retrieval.

Partial transcript fragments may update the visible transcript but should not continuously thrash the retrieval layer.

### 3. Keep question detection separate from retrieval

Question/intent detection is a lightweight routing concern. Retrieval should receive a coherent text query and should not need to know about audio chunking or UI timing.

Representative boundary:

```text
remote transcript events
    -> utterance assembler
        -> query candidate
            -> retrieval service
```

### 4. Index meaningful knowledge chunks, not transcript tokens

The personal corpus should be chunked by semantic units such as project, accomplishment, skill, architecture decision, metric, interview story, or role context. Retrieval should embed/query coherent interviewer intent, not tokenize the transcript into isolated words and search individual tokens.

### 5. Preserve provenance and experience status

Every knowledge chunk should carry metadata sufficient to distinguish:

- implemented work;
- prototype/experiment;
- architecture/design knowledge;
- hypothetical Clearlake-specific ideas;
- resume facts;
- metrics/claims and their source notes.

The cue layer must never present a hypothetical design as something already implemented.

### 6. Retrieval first; generation optional

MVP should be useful with retrieval alone. A cue may simply contain the top evidence and a suggested answer structure.

Optional synthesis may compress retrieved evidence into bullets, but it must not invent new experience claims or turn the overlay into a verbatim script.

### 7. Local-first by default

Audio transcription remains local. The initial retrieval/index path should support a fully local mode. Any future cloud model or embedding provider must be explicit, configurable, and visibly distinguishable from local processing.

### 8. Latency is a product requirement

Interview cues lose value if they arrive after the candidate has already answered. Query-boundary detection, retrieval, and rendering should be optimized for useful first-cue latency rather than exhaustive retrieval depth.

### 9. The overlay is a glanceable second screen, not a chat client

Default output should fit near the webcam and favor:

- likely question/intent;
- 3–5 evidence bullets;
- one recommended story/example;
- optional bridge to the target role;
- confidence/provenance indicator when useful.

Long-form generated answers are explicitly not the default interaction.

### 10. Meeting applications remain independent

The MVP must not depend on Zoom/Teams APIs, bots joining a meeting, or virtual audio devices. Hearsay continues to capture the Windows output device through WASAPI loopback.

## Privacy and Trust Invariants

- Raw audio is not persisted by the copilot feature.
- The user can run the copilot in transcript-ephemeral mode where finalized transcript text is not saved after the session.
- Personal corpus content stays local in local mode.
- Any cloud-based generation/retrieval provider is opt-in and clearly disclosed in settings before use.
- Retrieval results must retain source metadata so the user can distinguish factual experience from planning/hypothetical material.
- The application must provide a clear active-listening indicator.
- Session teardown must clear in-memory utterance buffers and transient cue state.
- The feature must not claim to determine whether meeting transcription is legally permitted; the user remains responsible for applicable consent, employer, and meeting policies.

## Non-Goals

- Automatically answering interview questions aloud.
- Replacing the candidate with an autonomous meeting bot.
- Joining Zoom/Teams as a participant.
- Persistently recording raw meeting audio.
- Building a general enterprise RAG platform.
- Generating fabricated experience or credentials.
- Continuously sending every transcript fragment to a cloud LLM.
- Solving speech-following teleprompter behavior; that is Epic 002.
- Refactoring every Hearsay subsystem before proving the MVP.

## Feature Decomposition

### Feature 1 — Transcript Event Extension Boundary

Add a generic, testable way for application components/extensions to subscribe to finalized source-tagged transcription results without coupling to `LiveTranscriptWindow` or markdown output.

**Proposed OpenSpec change:** `001-transcript-event-extension-boundary`

Deliverable: a test subscriber receives ordered `Remote`/`Local` finalized transcript events while existing Hearsay transcript writing and live view continue unchanged.

### Feature 2 — Ephemeral Copilot Session Mode

Add a session option that permits live transcription and extension processing without requiring transcript persistence after the meeting. Preserve current transcript-saving behavior as the default Hearsay mode unless product settings explicitly change it.

**Proposed OpenSpec change:** `002-ephemeral-copilot-session`

Deliverable: a copilot session can end with no raw audio and no saved transcript while still having provided live cues.

### Feature 3 — Local Knowledge Corpus and Index

Create a local corpus loader/indexer for Markdown/text/JSON project and resume material with semantic chunking, embeddings, metadata, and incremental re-indexing.

Representative metadata:

```json
{
  "project": "tenant-intelligence",
  "topics": ["ai", "semantic-search", "snowflake"],
  "skills": ["Python", "dbt", "Cortex Search", "Cortex Analyst"],
  "experience_status": "implemented",
  "source": "projects/tenant-intelligence.md"
}
```

**Proposed OpenSpec change:** `003-local-knowledge-index`

Deliverable: a CLI/test harness can index a curated corpus and return top-k relevant chunks with metadata for representative interview questions.

### Feature 4 — Remote Utterance and Question Boundary Detection

Assemble finalized remote transcript segments into coherent query candidates. Support pause/question heuristics first, with optional model-assisted intent detection only if measured quality warrants it.

**Proposed OpenSpec change:** `004-remote-question-boundaries`

Deliverable: recorded transcript fixtures produce stable, bounded retrieval queries instead of one retrieval per Whisper chunk.

### Feature 5 — Retrieval and Cue Composition

Embed the assembled query, retrieve top-k evidence, apply metadata filters/boosts, deduplicate overlapping chunks, and compose a concise cue model.

Representative cue model:

```text
intent
recommended_story
supporting_points[]
role_bridge[]
provenance[]
confidence
```

**Proposed OpenSpec change:** `005-interview-cue-retrieval`

Deliverable: representative AI/architecture interview questions return concise, provenance-preserving cues from the local corpus within the defined latency budget.

### Feature 6 — Always-On-Top Interview Cue Overlay

Create a compact, configurable overlay that can sit near the webcam, receive cue updates safely from background threads, and support keyboard/manual controls without disrupting Zoom/Teams focus.

**Proposed OpenSpec change:** `006-interview-cue-overlay`

Deliverable: during a simulated meeting, remote speech results in an updated glanceable cue panel while the meeting application retains focus.

### Feature 7 — End-to-End Interview Session Integration

Wire session mode, transcript events, query boundaries, retrieval, cue state, overlay, logging, and failure handling into one supported workflow with fixtures and a manual Windows acceptance run.

**Proposed OpenSpec change:** `007-live-interview-copilot-integration`

Deliverable: one complete local session proves the epic acceptance journey without changing Hearsay's existing normal transcription workflow.

## Existing Components / Reuse Boundaries

This epic should extend, not duplicate:

- `AudioRecorder` and WASAPI capture — retain existing device/recovery behavior.
- `TranscriptionPipeline` — retain per-source transcription, overlap deduplication, and echo filtering.
- `TranscriptionResult` — reuse/adapt source-tagged segments as the first event payload.
- `HearsayApp._poll_transcripts()` — current single drain boundary; refactor carefully so writer, live view, and extension subscribers see the same ordered results.
- `MarkdownWriter` — keep for ordinary transcription sessions; bypass only in explicit ephemeral mode.
- `LiveTranscriptWindow` — retain as transcript UI; the cue overlay is a separate focused projection.
- `StoppableThread` / `safe_after` — preserve existing threading/UI-safety conventions.
- `%APPDATA%\Hearsay` configuration/model conventions — extend without storing personal corpus paths or data in public committed files.

## Dependencies and Sequencing

1. **001 Transcript Event Extension Boundary** — first; establishes the reusable seam.
2. **002 Ephemeral Copilot Session** — can proceed after the event boundary is defined.
3. **003 Local Knowledge Index** — largely independent and can proceed in parallel.
4. **004 Remote Question Boundaries** — depends on transcript events/fixtures.
5. **005 Interview Cue Retrieval** — depends on 003 + 004.
6. **006 Interview Cue Overlay** — can start with fixture/manual cue inputs, then integrate with 005.
7. **007 End-to-End Integration** — capstone; depends on 001–006.

Do not defer privacy, threading safety, latency measurement, or source/provenance tests to the capstone.

## Success Metrics

Functional:

- Remote system audio is transcribed through the existing local Whisper path.
- Retrieval triggers once per coherent interviewer query/utterance rather than continuously per transcript fragment.
- Top cues contain relevant evidence for a curated evaluation set of interview questions.
- Hypothetical/planned examples are never silently presented as implemented experience.
- The overlay can operate while Zoom/Teams remains the foreground application.
- Existing Hearsay normal recording/transcript behavior remains regression-tested.

Latency:

- Measure transcription-completion → retrieval-query start.
- Measure query start → first cue rendered.
- Establish a target after baseline profiling; optimize for first useful cue rather than complete generated prose.

Privacy:

- Raw audio is never written by the copilot path.
- Ephemeral mode leaves no transcript artifact after normal session completion.
- Local mode performs no network call after required models/dependencies are installed.

Reliability:

- Session start/stop does not leak transcript events into a subsequent session.
- Retrieval/overlay failures do not crash or block audio transcription.
- Slow retrieval cannot cause unbounded query backlog; stale query results are dropped or superseded.

## Acceptance Journey

The epic is complete when a Windows acceptance run proves:

```text
user starts Interview Copilot mode
  -> Hearsay captures Zoom/Teams system audio through WASAPI loopback
    -> faster-whisper produces source-tagged Remote transcript events
      -> remote segments are assembled into a coherent interviewer question
        -> the question is embedded/searched against the local personal corpus
          -> relevant implemented experience is retrieved with provenance
            -> a concise cue appears near the webcam
              -> user answers naturally
                -> Local microphone speech does not trigger interviewer-question retrieval
                  -> next remote question supersedes stale cue work
                    -> session ends
                      -> transient buffers are cleared
                        -> no raw audio is persisted
                          -> in ephemeral mode, no interview transcript is persisted
```

The same build must also pass the ordinary Hearsay recording acceptance path, proving the copilot is additive rather than a regression of the base application.

## Risks

- **Whisper chunk latency is too high for live cues.** Mitigation: baseline current windowing and model behavior early; consider a low-latency streaming/shorter-window mode only if measured necessary.
- **Retrieval fires too often.** Mitigation: explicit utterance assembly, debounce/silence boundaries, stale-work cancellation, manual-trigger fallback.
- **Retrieval surfaces the wrong project.** Mitigation: curated metadata, hybrid lexical/vector scoring if useful, evaluation fixtures, visible provenance.
- **Generated cues overstate experience.** Mitigation: retrieval-first MVP, experience-status metadata, constrained synthesis, no unsupported claims.
- **UI distracts the user.** Mitigation: compact default layout, limited bullet count, keyboard controls, near-webcam positioning, no scrolling prose by default.
- **Copilot work destabilizes upstream Hearsay.** Mitigation: add extension seams first, isolate interview-specific packages, retain existing tests and manual audio checks.
- **Privacy expectations become ambiguous.** Mitigation: explicit session mode, active-listening indicator, no raw-audio persistence, opt-in cloud providers only.

## Open Questions for Feature Pickup

1. Is Hearsay's current ~30-second transcription window sufficiently responsive for an interview copilot, or does the MVP require a lower-latency window/streaming mode?
2. Should transcript subscribers receive whole `TranscriptionResult` objects, normalized per-segment events, or both?
3. What local embedding model and vector store provide the best Windows packaging/runtime tradeoff (for example FAISS, LanceDB, or Chroma with a local sentence-transformer)?
4. Should initial query-boundary detection use punctuation/silence heuristics only, or include a small local classifier?
5. How should retrieval cancel/supersede stale work when the interviewer continues speaking?
6. What is the minimum corpus schema needed to distinguish implemented, prototype, and hypothetical material without making authoring burdensome?
7. Should optional answer synthesis use a local model first, cloud providers as adapters, or remain out of the MVP until retrieval quality is proven?
8. How should the overlay behave when the meeting application is screen-shared?
