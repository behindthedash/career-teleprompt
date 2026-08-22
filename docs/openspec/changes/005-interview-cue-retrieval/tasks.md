## 1. Cue and retrieval models

- [ ] 1.1 Add UI-independent `InterviewCue`, supporting-point/provenance models, and `ready`/`no_match`/`unavailable` status values. File: `src/hearsay/copilot/cue.py`.
- [ ] 1.2 Implement the retrieval worker with a bounded latest-query-wins queue and session/generation stale-result checks. File: `src/hearsay/copilot/retrieval.py`.

## 2. Ranking and composition

- [ ] 2.1 Query the local knowledge index for a bounded semantic candidate set and add deterministic lexical/metadata boosts for exact project/topic/skill/text terms; retain component scores in diagnostics. File: `src/hearsay/copilot/retrieval.py`.
- [ ] 2.2 Group/deduplicate candidate chunks by source/project and choose the strongest eligible primary story plus bounded supporting evidence. File: `src/hearsay/copilot/cue.py`.
- [ ] 2.3 Enforce experience-status rules: hypothetical content cannot become implemented evidence; prototype/design remain labeled; unknown/missing status is not promoted. File: `src/hearsay/copilot/cue.py`.
- [ ] 2.4 Add role-bridge composition for clearly labeled hypothetical/application material without mixing it into the experience story. File: `src/hearsay/copilot/cue.py`.
- [ ] 2.5 Add retrieval-quality/confidence and latency diagnostics without representing them as truth probability. Files: `src/hearsay/copilot/retrieval.py`, `src/hearsay/copilot/cue.py`.

## 3. Evaluation tests

- [ ] 3.1 Add a synthetic interview evaluation fixture containing paraphrases, exact technology names, multiple candidate projects, hypothetical-only cases, and expected source ids. Files: `tests/fixtures/interview_eval.json`, synthetic knowledge fixtures.
- [ ] 3.2 Add ranking/composition tests for relevant top results, lexical boosts, duplicate suppression, five-point cue bound, and implemented-vs-hypothetical separation. File: `tests/test_interview_cue_retrieval.py`.
- [ ] 3.3 Add forced slow-generation tests proving an older result cannot replace a newer active cue and queue growth remains bounded. File: `tests/test_interview_cue_retrieval.py`.
- [ ] 3.4 Add no-match and unavailable-index tests proving transcription-facing callers receive a safe cue state rather than an exception.

## 4. Verification

- [ ] 4.1 Run the synthetic evaluation set and capture baseline recall/top-source correctness and query-to-cue latency for future regression comparison.
