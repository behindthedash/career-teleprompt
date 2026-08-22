## Why

With coherent interviewer queries (004) and a truthful local knowledge index (003), Epic [`001-live-interview-copilot`](../../../docs/specs/epics/001-live-interview-copilot.md) needs the decision layer that selects the best evidence and turns it into glanceable cues. The MVP should prove retrieval quality and provenance before adding a generative answer model.

## What Changes

- Retrieve a bounded candidate set from the local knowledge index for each `QueryCandidate`.
- Apply lightweight lexical/metadata reranking so exact technologies, project names, and skills can complement semantic similarity.
- Deduplicate overlapping chunks and choose one primary recommended story plus a small set of supporting evidence.
- Preserve and display experience status/provenance; hypothetical material cannot be promoted as implemented evidence.
- Compose a structured `InterviewCue` with intent/question text, recommended story, 3–5 supporting points, optional role-bridge material, provenance, and confidence/quality signals.
- Carry session/generation identity through retrieval and discard results that are stale before publication.
- Keep long-form LLM answer generation out of the MVP critical path.

## Capabilities

### New Capabilities

- `interview-cues`: provenance-preserving local retrieval, ranking, cue composition, claim-status safeguards, and stale-result suppression.

### Modified Capabilities

None.

## Impact

- New `src/hearsay/copilot/retrieval.py` and `cue.py` modules consuming changes 003/004.
- Background retrieval worker(s) are bounded and optional; they cannot block transcript publication.
- Synthetic evaluation dataset becomes the basis for relevance/regression tests.

## Product-Level Merge Gate

**Epic acceptance step advanced:** `question is searched -> relevant implemented experience is retrieved -> concise cue model is ready for display`.

Representative AI/architecture questions must return useful evidence with truthful status/provenance and bounded latency; a newer question must prevent an older retrieval result from becoming the current cue.
