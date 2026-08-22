## Context

Change 003 exposes local top-k vector retrieval with chunk metadata; change 004 emits coherent `QueryCandidate` objects with `(session_id, generation)`. This change combines them but remains independent of tkinter/UI so retrieval quality can be evaluated headlessly.

## Goals / Non-Goals

**Goals:**
- High-signal cue selection from a small personal corpus.
- Strong safeguards against overstating hypothetical/design material.
- Bounded latency/work queues and stale-result suppression.

**Non-Goals:**
- No LLM-generated paragraph answers.
- No internet search.
- No autonomous actions in the meeting application.

## Decisions

### D1. Retrieval is background, latest-query-wins

Introduce a bounded retrieval worker accepting `QueryCandidate`. The worker tracks the newest generation per session. If work is queued faster than it can be completed, older not-yet-started work is superseded; a completed result is published only if its generation is still current.

### D2. Start with vector top-k plus transparent lexical boost

Request a moderately larger semantic candidate set (for example 8–12 chunks), then compute a small deterministic boost for normalized exact matches against chunk `skills`, `topics`, `project`, title, and text. Keep the formula/config centralized and include component scores in debug diagnostics so relevance regressions are explainable.

Do not add an LLM reranker for the MVP.

### D3. Aggregate chunks into stories before composing bullets

Group candidate chunks by project/source. Choose the strongest eligible project as `recommended_story`; supporting points come from its strongest non-duplicate chunks plus at most a small amount of corroborating evidence from other sources. This avoids showing five near-identical chunks from one document.

### D4. Experience status is a hard composition rule

`implemented` is eligible for primary story without caveat. `prototype`/`design` remain explicitly labeled. `hypothetical` is excluded from the implemented-story pool and may appear only in a separate `role_bridge` section with its status. Missing/unknown status is treated as unsafe and not promoted.

### D5. `InterviewCue` is data, not rendered prose

Define a UI-independent dataclass roughly containing:

```text
session_id
generation
query_text
recommended_story
supporting_points[]
role_bridge[]
provenance[]
confidence
status: ready | no_match | unavailable
latency_ms
```

Supporting points include source/status metadata internally even if the overlay shows a compact projection.

### D6. Confidence is retrieval quality, not truth probability

Compute a simple relative quality indicator from top score/margin and evidence count. Label it as retrieval confidence/quality in diagnostics; do not imply the system has measured whether a resume claim itself is true.

## Risks / Trade-offs

- **Heuristic lexical boost can overweight jargon.** Keep boost small, test against evaluation fixtures, and preserve raw vector scores for diagnosis.
- **No generative synthesis means bullets may be less polished.** Intentional; fidelity and speed matter more for MVP. The user provides the spoken answer.
- **One primary story can hide useful alternatives.** Preserve a bounded alternative source list internally; UI can add manual cycling later if needed.

## Files Expected to Change

- `src/hearsay/copilot/retrieval.py`
- `src/hearsay/copilot/cue.py`
- `tests/test_interview_cue_retrieval.py`
- `tests/fixtures/interview_eval.json` with synthetic questions/expected source ids

## Verification

Run a deterministic synthetic evaluation set covering exact-technology queries, semantic paraphrases, implemented-vs-hypothetical competition, no-match, index failure, duplicate chunks, and forced stale-generation completion. Record latency separately from transcription latency.
