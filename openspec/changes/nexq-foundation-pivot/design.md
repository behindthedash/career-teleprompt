## Context

See proposal.md for motivation. This design records how the pivot is executed and how the Career Teleprompt differentiators are layered onto the adopted foundation. It is written against the integration branch as it stands, which matters because much of the work has already landed:

- The foundation import is complete. The active tree is NexQ at pinned baseline `1ce1524c122df509f231c521a07ada95bfde2d88` (see `docs/NEXQ_BASELINE.md` and `docs/FOUNDATION_MIGRATION.md`), imported as a single explicit change on top of the pre-pivot history. The Python Hearsay runtime was removed in that change and remains recoverable from history.
- The GitHub repository has already been renamed to `career-teleprompt`; its description and topics still describe the Hearsay transcription app.
- Teleprompter content model, overlay mode, speech-following alignment, follow UX, AI-response handoff, and the first interview-grounding ports exist under `src/teleprompter/`, `src/stores/teleprompterStore.ts`, `src/overlay/TeleprompterPanel.tsx`, `src/hooks/useTeleprompterFollower.ts`, `src/teleprompter/handoff.ts`, and `src-tauri/src/rag/{interview_rerank,prompt_builder}.rs`, with Node assertion tests under `tests/` and Rust unit tests run by CI.
- CI is the NexQ Node/Rust/Tauri toolchain on `windows-latest` (required check `Windows tests, typecheck, build & Rust check`), plus installer, native-audio, dual-party audio, and Playwright workflow jobs.
- Governance documents still describe the pre-pivot host: `AGENTS.md` (PyInstaller build steps), `openspec/README.md` (Hearsay product boundary), and `openspec/config.yaml` (rules forbidding teleprompter semantics), and five canonical specs under `openspec/specs/` describe the retired Python host.

This change is therefore the governing spec for the pivot: it must cover landed work with contracts, retire the obsolete host contracts, and leave an honest task list for what is still owed.

## Goals / Non-Goals

**Goals:**
- Give every pivot phase a testable behavior contract under `openspec/specs/` using the flat capability layout the project already uses.
- Retire the Hearsay host contracts that no longer describe any code, rather than leaving them as canonical "current behavior".
- Keep NexQ audio/STT/RAG/LLM/overlay code as adopted infrastructure with an explicit evidence bar for modifying it.
- Make the remaining work compilable by the worktrail conductor: each task carries explicit file scope.

**Non-Goals:**
- Re-deciding the foundation choice, the repository strategy, or the migration mechanics (approved in proposal.md).
- Rebuilding capture, STT packaging, or a second RAG store.
- Preserving Python module compatibility for the retired Hearsay extension API.
- Archiving or reconciling the other pre-pivot changes under `openspec/changes/` (a separate close-out change).

## Decisions

### D1. NexQ is vendored as a pinned tree, not consumed as a dependency
The application tree is a copy of one upstream commit, recorded in migration documentation. Alternatives: git subtree/submodule (keeps upstream mechanically close but makes the required governance/branding/CI divergence awkward and ties every build to upstream layout) or a fork with upstream as a remote (history would be NexQ's, violating "keep the existing repository canonical"). A vendored, pinned copy keeps this repository's history primary and makes upstream adoption an explicit, reviewable act, which the modified upstream-contribution-workflow spec now requires.

### D2. Hearsay host specs are REMOVED, not MODIFIED
The four host capabilities (`transcript-events`, `extension-host-import-boundary`, `live-only-session`, `low-latency-transcription`) describe a Python API and session model that no longer exist. Rewriting them onto NexQ would invent contracts nobody asked for. Each requirement is removed with a reason and a "no migration" note; `upstream-contribution-workflow` is kept and re-targeted at NexQ because its three requirements remain true of the new upstream. Its `## Purpose` line still says "upstream Hearsay" and is edited directly in the main spec as a task, since deltas cannot change Purpose.

### D3. New capabilities map one-to-one onto the epic delivery sequence, named as durable nouns
`nexq-foundation`, `teleprompter-content-model`, `teleprompter-overlay-mode`, `speech-following-alignment`, `teleprompter-follow-ux`, `ai-response-teleprompter-handoff`, `interview-response-grounding` correspond to epic 004 steps 1 through 7. Verb-shaped change names from the epic (`-import`, `-port`) were not used as capability names because capabilities outlive the change that created them.

### D4. The follower reads corrected transcript state, never raw audio or STT events
The follower derives its input from the `You` segments in the transcript store (last few segments joined), so interim-to-final corrections are replaced before alignment instead of appended. This satisfies the proposal's "no direct raw-audio dependency" constraint and keeps the follower independent of which STT provider is active. Alternative rejected: subscribing to raw STT events, which would re-create the Hearsay subscriber problem and make correction churn the follower's job.

### D5. Alignment is monotonic with hold and recovery thresholds
Candidate positions are searched in a window around the last position and scored by ordered token overlap plus fuzzy phrase similarity, with a boost for distinctive runs of words that occur once in the script and no boost for repeated phrases. Two thresholds exist: a local threshold below which the follower holds and reports uncertain/lost, and a higher recovery threshold that a distant match must exceed with enough spoken evidence before it counts as an intentional jump. Backward moves are never produced by alignment. Alternative rejected: a global best-match search, which bounces on repeated phrases and STT corrections.

### D6. Manual override is sticky until explicit resume
The original task list said "suppress auto-follow briefly after manual navigation". The landed behavior is stronger and simpler: any manual navigation, click positioning, or edit disables following, and the user re-enables it explicitly, after which alignment continues from the chosen position. A timed suppression was rejected because it re-engages while the user may still be reading manually and is harder to reason about during an interview. The follow-UX spec records the sticky behavior.

### D7. Generated documents are ephemeral values with an explicit promotion step
Generated documents carry an `ephemeral` flag and provenance (response session, generation counter, evidence). Nothing writes them to storage; `Save as Prepared` produces a prepared, non-ephemeral document with the same sections and provenance. This makes "not persisted unless explicitly saved" a property of the data model rather than of every UI path.

### D8. Successive AI answers use a pending-document lifecycle
A `What to Say` answer loads immediately into an empty teleprompter, but when the user is mid-read a new answer is staged as pending and activates only when the follower is confidently at the final token of the current document (or the user activates/dismisses it). Editing blocks staging. Alternative rejected: always replacing the current document, which yanks text away while the user is speaking it.

### D9. Interview-grounding ports go into the adopted Rust prompt/RAG layer
Evidence re-ranking, prepared Q&A preference, answer-use history rules, and truthfulness rules were ported as prompt-builder sections and a re-rank pass in `src-tauri/src/rag/`, verified by Rust unit tests and Node prompt-content tests. No Python module is ported as architecture; only behavior and tests. The remaining port decisions (cue retrieval, grounded composer, query boundaries, response policy) are recorded as comparison entries in `docs/INTERVIEW_COPILOT_PORT.md` before any further code is written; the table below seeds that record. It lives under `docs/` rather than in this change because the worktrail conductor forbids workers from editing `openspec/`, and the record must outlive the change's archive.

### D10. Verification strategy
Node assertion tests run through a dedicated test tsconfig and `npm test`; Rust behavior runs through targeted `cargo test` invocations in the required CI job; native audio and dual-party routing have contract tests and a self-hosted hardware job; the launcher/RAG/AI/teleprompter journey and failure-recovery paths run under Playwright. Manual hardware-matrix items that CI cannot exercise are recorded in migration documentation instead of being claimed.

### Port record seed (D9, maintained in `docs/INTERVIEW_COPILOT_PORT.md`)
| Pre-pivot behavior | Foundation equivalent | Decision |
|---|---|---|
| Grounded composition truthfulness rules | Prompt-builder grounding rules | Ported; covered by prompt tests |
| Prepared Q&A preference | Prompt-builder prepared-Q&A section + prepared Q&A retrieval | Ported; covered by prompt tests |
| Answer-use history | Prompt-builder answer-history section | Ported; covered by prompt tests |
| Interview evidence ranking | Interview re-rank pass in RAG search | Ported; covered by Rust unit tests |
| Cue retrieval (`cue_retrieval.py`) | RAG hybrid search + interview re-rank | Comparison pending (task 10.1) |
| Grounded composer (`grounded_composer.py`) | Prompt templates + context builder | Comparison pending (task 10.1) |
| Query boundaries (`query_boundaries.py`) | Question detector | Comparison pending (task 10.2) |
| Response policy (`response_policy.py`) | Scenario/action configuration | Comparison pending (task 10.2) |

## Risks / Trade-offs

- [Upstream drift: NexQ changes quickly and the vendored copy ages] → Baseline SHA is recorded and only updated by explicit adoption changes; upstream is reviewed, not tracked.
- [Product work landed before the manual hardware matrix was completed, inverting the proposal's sequencing] → The matrix gate is restated as "before adopted capture/STT code is modified"; automated audio contract and hardware jobs cover part of it; the remaining manual items stay open tasks with a recorded outcome doc, not silent assumptions.
- [Removing 23 host requirements looks like lost work] → Nothing runnable is lost; pre-pivot history and specs remain in Git. The removal prevents the canonical spec set from describing code that does not exist.
- [Sticky manual override could leave a user unfollowed without noticing] → The panel shows an explicit "manual override" status and a one-click resume; covered by the follow-UX spec.
- [Paraphrase tolerance is bounded by token overlap, so heavy rewording holds rather than advances] → Acceptable per proposal (hold, never jump); the corpus test for paraphrase pins the supported tolerance.
- [Governance docs still describe Hearsay, so agents may follow PyInstaller instructions] → Explicit tasks update `AGENTS.md`, `openspec/README.md`, and `openspec/config.yaml` in this change.
- [Generated-answer auto-handoff could replace a script the user typed] → Staging is blocked while editing; only an empty teleprompter is filled automatically.

## Migration Plan

Executed (verifiable on the integration branch):
1. Single foundation-import change replaced the runtime with the pinned NexQ tree, kept `openspec/` and governance files, added baseline/migration docs, and switched CI to Node/Rust/Tauri.
2. Windows installer and release workflows build and smoke-test the migrated application.
3. GitHub repository renamed to `career-teleprompt`.

Remaining (tracked in tasks.md):
4. Update repository description/topics and the pre-pivot governance docs and OpenSpec config to the NexQ foundation.
5. Record the manual hardware acceptance matrix outcomes; open concrete specs for any failure.
6. Close the four pending port comparisons; port only what materially improves grounding.
7. Add the paraphrase and restarted-sentence corpus cases, and the content-model parity tests that are still missing.
8. Mark `hearsay-interview-copilot` as reference-only and add its migration notice after the port record is closed.

Rollback: the pre-pivot runtime is recoverable at any commit before the foundation import; no data migration exists to reverse because meeting persistence started with the new foundation.

## Open Questions

- Which physical Bluetooth and USB audio devices are available for the manual matrix, and on what date they were exercised. This only affects the recorded outcome, not the specs or tasks.
- Whether upstream NexQ will accept generic fixes back; the workflow spec already covers both outcomes.
