# Tasks: NexQ Foundation Pivot

## Phase 0 — Repository transition
- [x] Decide to keep the existing repository as canonical history.
- [x] Define target repository identity: `career-teleprompt`.
- [x] Record the NexQ adoption decision and architecture boundary.
- [ ] Rename GitHub repository from `hearsay` to `career-teleprompt` after migration PR acceptance.
- [ ] Update repository description/topics after rename.
- [ ] Mark `hearsay-interview-copilot` as superseded/reference-only once differentiated behavior is ported.

## Phase 1 — NexQ foundation import
- [ ] Pin an exact `naxhq/NexQ` baseline commit SHA.
- [ ] Snapshot current Hearsay `dev` head in migration documentation.
- [ ] Import NexQ application tree into this repository.
- [ ] Preserve `openspec/` and Career Teleprompt migration documentation.
- [ ] Preserve NexQ MIT license/copyright notice.
- [ ] Preserve any required Hearsay license attribution for retained material.
- [ ] Replace Python/PyInstaller CI with NexQ Node/Rust/Tauri build pipeline.
- [ ] Build Windows installer from the migrated repository.
- [ ] Validate unmodified NexQ baseline before product changes.

### Hardware acceptance matrix
- [ ] built-in microphone
- [ ] default speakers/system loopback
- [ ] Bluetooth output
- [ ] USB audio device
- [ ] browser playback as `Them`
- [ ] Zoom/Teams-like playback as `Them`
- [ ] local STT provider
- [ ] cloud STT provider
- [ ] device switching/restart behavior
- [ ] overlay always-on-top behavior
- [ ] interview scenario + RAG document load

## Phase 2 — Teleprompter content model
- [ ] Define `TeleprompterDocument` and `TeleprompterSection` TypeScript types.
- [ ] Support `prepared` and `generated` origins.
- [ ] Preserve separate `displayText` and normalized `matchText`.
- [ ] Support TXT and Markdown ingestion.
- [ ] Split Markdown into stable ordered sections.
- [ ] Track source provenance.
- [ ] Keep generated documents ephemeral by default.
- [ ] Add explicit save conversion from generated -> prepared.
- [ ] Port behavioral tests from Python `teleprompter_content.py`.

## Phase 3 — Teleprompter overlay mode
- [ ] Add `teleprompt` to overlay layout modes.
- [ ] Add dedicated full/focused teleprompter panel.
- [ ] Create fixed reading zone near upper-middle of the overlay.
- [ ] Add configurable font size and line spacing.
- [ ] Add previous/next/manual positioning controls.
- [ ] Add keyboard shortcuts.
- [ ] Reuse NexQ opacity/always-on-top/window behavior.
- [ ] Allow prepared document selection before/during interview.

## Phase 4 — Speech-following alignment
- [ ] Subscribe to live finalized and partial `You` transcript updates.
- [ ] Maintain a rolling spoken-token buffer.
- [ ] Normalize transcript tokens using the same normalization as prepared match text.
- [ ] Implement moving-window candidate search around last known position.
- [ ] Score ordered token overlap.
- [ ] Add edit-distance/fuzzy phrase scoring.
- [ ] Add phrase-anchor boosts for distinctive runs of words.
- [ ] Default to monotonic forward progress.
- [ ] Hold instead of jumping when confidence is below threshold.
- [ ] Support large intentional jump-forward recovery.
- [ ] Prevent partial/final STT correction churn from bouncing progress backward.
- [ ] Expose alignment confidence and follower state to UI.

### Alignment test corpus
- [ ] exact reading
- [ ] skipped word/phrase
- [ ] filler words
- [ ] synonym/minor paraphrase
- [ ] restart sentence
- [ ] repeat previous phrase
- [ ] unrelated aside
- [ ] large jump forward
- [ ] STT partial replaced by corrected final
- [ ] repeated common phrase appearing in multiple script locations

## Phase 5 — Follow UX
- [ ] Smooth-scroll current position into the reading zone.
- [ ] Visually de-emphasize completed text.
- [ ] Highlight current phrase/sentence.
- [ ] Emphasize limited upcoming text.
- [ ] Pause visual movement when follower confidence is low.
- [ ] Add manual override.
- [ ] Add explicit resume-follow action.
- [ ] Suppress auto-follow briefly after manual navigation.
- [ ] Persist per-user teleprompter presentation preferences.

## Phase 6 — AI response handoff
- [ ] Add `Prompt` / `Send to Teleprompter` action to eligible AI responses.
- [ ] Convert `What to Say` output into an ephemeral generated teleprompter document.
- [ ] Begin follower alignment when the user starts speaking the generated response.
- [ ] Do not persist generated content automatically.
- [ ] Add explicit Save as Prepared action.
- [ ] Preserve response/RAG provenance where available.

## Phase 7 — Selective interview-copilot port
- [ ] Compare `cue_retrieval.py` behavior against NexQ RAG/search.
- [ ] Compare `grounded_composer.py` against NexQ prompt/intelligence flow.
- [ ] Compare `query_boundaries.py` against NexQ question detection.
- [ ] Compare `response_policy.py` against NexQ scenario/action configuration.
- [ ] Port only behavior that materially improves interview response grounding.
- [ ] Add prepared Q&A retrieval where useful.
- [ ] Add answer-use/history controls to reduce repetitive suggestions.

## Decommissioning
- [ ] Stop active development on Hearsay PyAudioWPatch/sounddevice capture.
- [ ] Stop active work on faster-whisper/CTranslate2 packaging and CUDA diagnostics.
- [ ] Stop extending the Hearsay subscriber/extension-host architecture.
- [ ] Retain pre-pivot branches/tags/history for reference.
- [ ] Add migration notice to the old Python interview-copilot repository after successful port.
