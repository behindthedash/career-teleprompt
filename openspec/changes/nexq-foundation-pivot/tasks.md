# Tasks: NexQ Foundation Pivot

Checked items are verified against the integration branch (`dev`). Each task declares the
repo-relative files it creates or modifies on an indented `files:` line so the worktrail
conductor can compile the run plan without inference. Tasks whose scope is under `openspec/`
are planning-artifact edits and must run outside the conductor fan-out.

## 1. Repository transition

- [x] 1.1 Record the decision to keep the existing repository as canonical history and the NexQ adoption/architecture boundary in epic 004.
      files: openspec/epics/004-nexq-career-teleprompt-pivot.md
- [x] 1.2 Define the target repository identity `career-teleprompt` and the migration mechanics in the approved proposal.
      files: openspec/changes/nexq-foundation-pivot/proposal.md
- [x] 1.3 [chore] Rename the GitHub repository from `hearsay` to `career-teleprompt` (done; `gh repo view` reports the new name with redirects intact).
      files: docs/FOUNDATION_MIGRATION.md
- [ ] 1.4 [chore] Update the GitHub repository description and topics to describe Career Teleprompt (`gh repo edit --description ... --add-topic ...`), and record the rename date and new identity, plus the pre-pivot Hearsay `dev` head SHA (the parent of the foundation-import commit), in the migration doc so the recoverable snapshot is named, not implied (Requirement: Pre-pivot history remains recoverable in one canonical repository).
      files: docs/FOUNDATION_MIGRATION.md
- [ ] 1.5 [docs] Rewrite `AGENTS.md` for the NexQ foundation: Node/Rust/Tauri build and run commands, `npm test` and targeted `cargo test` verification, the required CI check name, installer workflow, and the "adopted infrastructure changes only against reproducible requirements" rule; remove the PyInstaller/Inno Setup/Hearsay-version-sync instructions. `CLAUDE.md` stays `@AGENTS.md` (Requirement: Single production desktop shell).
      files: AGENTS.md
- [ ] 1.6 [docs] Update `openspec/README.md` product boundary and roadmap (add epic 004, describe what is adopted from NexQ versus built as Career Teleprompt) and rewrite `openspec/config.yaml` context and rules so they describe the NexQ foundation and no longer forbid teleprompter/RAG/interview semantics (Requirement: Foundation baseline is pinned and documented).
      files: openspec/README.md, openspec/config.yaml
- [ ] 1.7 [docs] Edit the `## Purpose` line of the canonical upstream-contribution-workflow spec to name NexQ as upstream; deltas cannot change Purpose (Requirement: NexQ upstream sync is repeatable and non-destructive; Requirement: NexQ upstream contributions exclude consumer/private material; Requirement: NexQ contribution rejection does not block local evolution).
      files: openspec/specs/upstream-contribution-workflow/spec.md

## 2. NexQ foundation import

- [x] 2.1 Pin the exact `naxhq/NexQ` baseline commit SHA, date, message, and license in the baseline doc (Requirement: Foundation baseline is pinned and documented).
      files: docs/NEXQ_BASELINE.md
- [x] 2.2 Import the NexQ application tree at the pinned baseline as a single explicit change replacing the Python runtime.
      files: package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json, src/main.tsx
- [x] 2.3 Preserve `openspec/`, `.github/`, `.worktrail/`, and migration documentation across the runtime replacement.
      files: docs/FOUNDATION_MIGRATION.md, openspec/README.md
- [x] 2.4 Preserve NexQ's MIT license and copyright notice at the repository root (Requirement: Upstream attribution is preserved).
      files: LICENSE
- [x] 2.5 Replace the Python/PyInstaller CI with the NexQ Node/Rust/Tauri pipeline on `windows-latest` and point the `dev` ruleset at the new required check (Requirement: Single production desktop shell).
      files: .github/workflows/ci.yml, .github/rulesets/protect-dev.json
- [x] 2.6 Build and smoke-test the Career Teleprompt Windows NSIS installer from the migrated repository in CI and on release (Requirement: Single production desktop shell).
      files: .github/workflows/windows-installer.yml, .github/workflows/release.yml, scripts/smoke-test-windows-installer.ps1, src-tauri/tauri.installer.conf.json
- [ ] 2.7 Configure the Tauri bundle to ship the MIT license notice in the Windows installer and assert its presence in the installer smoke test (Requirement: Upstream attribution is preserved, scenario "Installer distribution").
      files: src-tauri/tauri.conf.json, scripts/smoke-test-windows-installer.ps1

## 3. Hardware acceptance matrix

- [ ] 3.1 [docs] Determine whether any pre-pivot MIT-licensed Hearsay material remains in the active tree; add attribution if so, otherwise record "no pre-pivot code retained in the active tree" (Requirement: Upstream attribution is preserved). Create the hardware acceptance record with one row per matrix item (item, outcome, generic device description, date). Link both notes from the migration doc (Requirement: Baseline validation is recorded before infrastructure is modified).
      files: docs/HARDWARE_ACCEPTANCE.md, docs/FOUNDATION_MIGRATION.md, LICENSE
- [x] 3.2 Automated PCM, VAD, and source-routing smoke plus the dual-party routing contract run in CI on Windows.
      files: src-tauri/tests/native_audio_smoke.rs, src-tauri/tests/dual_party_audio_contract.rs, .github/workflows/native-audio-smoke.yml, .github/workflows/dual-party-audio.yml
- [x] 3.3 Provisioned self-hosted Windows dual-party capture job exercises real microphone plus loopback capture.
      files: src-tauri/tests/dual_party_audio_hardware.rs, .github/workflows/dual-party-audio.yml
- [ ] 3.4 [e2e] Record built-in microphone outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.5 [e2e] Record default speakers/system loopback outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.6 [e2e] Record Bluetooth output outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.7 [e2e] Record USB audio device outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.8 [e2e] Record browser playback captured as `Them` outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.9 [e2e] Record Zoom/Teams-like playback captured as `Them` outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.10 [e2e] Record local STT provider outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.11 [e2e] Record one cloud STT provider outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.12 [e2e] Record device switching and restart outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.13 [e2e] Record overlay always-on-top outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.14 [e2e] Record interview scenario with RAG document load outcome.
      files: docs/HARDWARE_ACCEPTANCE.md
- [ ] 3.15 [cleanup] For each recorded failure open a concrete OpenSpec change before touching capture/STT code; otherwise record "no failures" (Requirement: Adopted infrastructure changes only against reproducible requirements).
      files: docs/HARDWARE_ACCEPTANCE.md

## 4. Teleprompter content model

- [x] 4.1 Define the document and section types with `prepared` and `generated` origins (Requirement: Origin and provenance are tracked).
      files: src/teleprompter/content.ts
- [x] 4.2 Keep display text separate from normalized match text; normalization never changes what the user sees (Requirement: Documents are ordered sections with display and match text).
      files: src/teleprompter/content.ts
- [x] 4.3 Load plain text and Markdown, splitting Markdown into stable ordered sections at headings, and infer format from the imported file extension (Requirement: Prepared documents load from plain text and Markdown).
      files: src/teleprompter/content.ts, src/teleprompter/fileImport.ts
- [x] 4.4 Track source provenance for prepared documents and response session, generation counter, and evidence for generated ones; derive stable identifiers from content (Requirements: Origin and provenance are tracked, Section identity is stable).
      files: src/teleprompter/content.ts
- [x] 4.5 Keep generated documents ephemeral by default and provide explicit promotion from generated to prepared (Requirement: Generated documents are ephemeral unless explicitly saved).
      files: src/teleprompter/content.ts, src/stores/teleprompterStore.ts
- [ ] 4.6 Confirm parity with the pre-pivot content-model tests: diff the `teleprompter_content.py` test cases in the `hearsay-interview-copilot` repository against the Node content tests and add any missing cases (Requirement: Content-model behavior is regression-tested).
      files: tests/teleprompter-content.test.mjs

## 5. Teleprompter overlay mode

- [x] 5.1 Add `teleprompt` to the overlay layout modes and render the dedicated panel in that mode (Requirement: Overlay offers a teleprompter layout mode).
      files: src/stores/overlayLayoutStore.ts, src/overlay/OverlayView.tsx
- [x] 5.2 Build the full-panel teleprompter view (Requirement: Overlay offers a teleprompter layout mode).
      files: src/overlay/TeleprompterPanel.tsx
- [x] 5.3 Fixed reading line at a configurable percentage of panel height, defaulting to the upper-middle (Requirement: Fixed reading zone).
      files: src/overlay/TeleprompterPanel.tsx, src/stores/teleprompterStore.ts
- [x] 5.4 Bounded font-size and line-spacing controls (Requirement: Presentation controls).
      files: src/overlay/TeleprompterPanel.tsx, src/stores/teleprompterStore.ts
- [x] 5.5 Previous/next section, click-to-position, and Page Up/Page Down keyboard stepping (Requirement: Manual navigation and keyboard control).
      files: src/stores/teleprompterStore.ts, src/overlay/TeleprompterPanel.tsx, src/teleprompter/display.ts
- [x] 5.6 Reuse the overlay's opacity, always-on-top, stealth, and placement behavior with no separate window (Requirement: Existing overlay window behavior is reused).
      files: src/overlay/OverlayView.tsx
- [x] 5.7 Enter or import a prepared document before or during a meeting; editing pauses following (Requirement: Prepared document selection before or during an interview).
      files: src/overlay/TeleprompterPanel.tsx, src/teleprompter/fileImport.ts, src/stores/teleprompterStore.ts
- [ ] 5.8 [docs] Document teleprompter mode, prepared-document import, the `Prompt` handoff, and the Page Up/Page Down shortcuts in the user guide (Requirements: Manual navigation and keyboard control, Eligible AI responses offer a teleprompter action).
      files: docs/user-guide/keyboard-shortcuts.md, docs/user-guide/interview-copilot.md

## 6. Speech-following alignment

- [x] 6.1 Feed the corrected `You` transcript state (partial and final) into the follower; never raw audio or STT events (Requirement: Follower consumes transcript state, not audio).
      files: src/hooks/useTeleprompterFollower.ts
- [x] 6.2 Maintain a rolling spoken-token window from the most recent `You` segments (Requirement: Follower consumes transcript state, not audio).
      files: src/hooks/useTeleprompterFollower.ts, src/teleprompter/follower.ts
- [x] 6.3 Tokenize transcript text with the document's match-text normalization (Requirement: Transcript tokens use the document's normalization).
      files: src/teleprompter/follower.ts, src/teleprompter/content.ts
- [x] 6.4 Moving-window candidate search with ordered-overlap and fuzzy phrase scoring (Requirement: Alignment searches a moving window and scores fuzzily).
      files: src/teleprompter/follower.ts
- [x] 6.5 Distinctive-phrase anchor boost that ignores phrases occurring more than once (Requirement: Alignment searches a moving window and scores fuzzily).
      files: src/teleprompter/follower.ts
- [x] 6.6 Monotonic progress, hold below the local threshold, and recovery jumps above the recovery threshold with sufficient evidence (Requirements: Progress is monotonic by default, Low confidence holds instead of jumping, Intentional forward jumps recover).
      files: src/teleprompter/follower.ts
- [x] 6.7 STT partial-to-final correction churn never moves the position backward (Requirement: Progress is monotonic by default).
      files: src/teleprompter/follower.ts, src/hooks/useTeleprompterFollower.ts
- [x] 6.8 Expose confidence, `following`/`uncertain`/`lost` status, and recovery flag to the store and panel (Requirement: Confidence and status are exposed).
      files: src/stores/teleprompterStore.ts, src/overlay/TeleprompterPanel.tsx

## 7. Alignment test corpus

- [x] 7.1 Exact reading advances.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.2 Skipped word/phrase still aligns.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.3 Filler words do not stop progress.
      files: tests/teleprompter-follower.test.mjs
- [ ] 7.4 Synonym/minor paraphrase still advances, completing the corpus in CI (Requirements: Tolerates filler, omission, and minor paraphrase, scenario "Minor paraphrase"; Alignment corpus is regression-tested).
      files: tests/teleprompter-follower.test.mjs
- [ ] 7.5 Restarted sentence never moves backward and resumes advancing (Requirement: Progress is monotonic by default, scenario "Restarted sentence").
      files: tests/teleprompter-follower.test.mjs
- [x] 7.6 Repeating an earlier phrase never moves backward.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.7 Unrelated aside holds position.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.8 Large jump forward recovers.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.9 STT partial replaced by corrected final stays monotonic.
      files: tests/teleprompter-follower.test.mjs
- [x] 7.10 Repeated common phrase in multiple script locations receives no anchor boost.
      files: tests/teleprompter-follower.test.mjs

## 8. Follow UX

- [x] 8.1 Smooth-scroll the current position onto the reading line (Requirement: Current position scrolls smoothly into the reading zone).
      files: src/overlay/TeleprompterPanel.tsx
- [x] 8.2 Completed, current, and upcoming reading states with distinct treatment, covered by display tests (Requirement: Completed, current, and upcoming text are visually distinct).
      files: src/teleprompter/display.ts, src/overlay/TeleprompterPanel.tsx, tests/teleprompter-display.test.mjs
- [x] 8.3 Pause visual movement and show a holding message while status is uncertain or lost (Requirement: Low confidence pauses visual movement).
      files: src/overlay/TeleprompterPanel.tsx
- [x] 8.4 Manual navigation, click positioning, and editing disable automatic following (Requirement: Manual override and explicit resume).
      files: src/stores/teleprompterStore.ts
- [x] 8.5 Explicit resume-following action continues alignment from the current position (Requirement: Manual override and explicit resume).
      files: src/stores/teleprompterStore.ts, src/overlay/TeleprompterPanel.tsx
- [x] 8.6 Persist font size, line spacing, and reading-line position per user with validation and defaults (Requirement: Presentation preferences persist).
      files: src/teleprompter/preferences.ts, src/stores/teleprompterStore.ts, tests/teleprompter-preferences.test.mjs

## 9. AI response handoff

- [x] 9.1 Offer the `Prompt` action on completed, non-empty AI responses only (Requirement: Eligible AI responses offer a teleprompter action).
      files: src/teleprompter/handoff.ts, src/overlay/AIResponsePanel.tsx
- [x] 9.2 Convert a response into a generated ephemeral document and switch the overlay to teleprompter mode (Requirement: Handoff produces a generated document and switches modes).
      files: src/teleprompter/handoff.ts, src/overlay/AIResponsePanel.tsx
- [x] 9.3 Auto-load completed `What to Say` answers into an empty teleprompter and stage later answers as pending until the follower confidently reaches the end of the current document; editing blocks staging (Requirement: Interview guidance enters the teleprompter automatically without interrupting reading).
      files: src/stores/streamStore.ts, src/teleprompter/lifecycle.ts, src/teleprompter/completion.ts, src/hooks/useTeleprompterFollower.ts
- [x] 9.4 Never persist generated content automatically; provide `Save as Prepared` (Requirement: Generated content is not persisted automatically).
      files: src/stores/teleprompterStore.ts, src/overlay/TeleprompterPanel.tsx
- [x] 9.5 Carry response session, generation counter, and evidence references into the generated document (Requirement: Response provenance is preserved).
      files: src/teleprompter/handoff.ts
- [x] 9.6 Handoff, lifecycle, completion, and auto-first-answer tests.
      files: tests/teleprompter-handoff.test.mjs, tests/teleprompter-lifecycle.test.mjs, tests/teleprompter-completion.test.mjs, tests/teleprompter-auto-first-answer.test.mjs

## 10. Selective interview-copilot port

- [ ] 10.1 [docs] Compare `cue_retrieval.py` (hearsay-interview-copilot) against the foundation's hybrid RAG search plus interview re-rank, and `grounded_composer.py` against the prompt templates and context builder; record both gaps and port/no-port decisions in the port record (Requirement: Port decisions are evidence-based and recorded).
      files: docs/INTERVIEW_COPILOT_PORT.md
- [ ] 10.2 [docs] Compare `query_boundaries.py` against the question detector, and `response_policy.py` against scenario and action configuration; record both decisions.
      files: docs/INTERVIEW_COPILOT_PORT.md
- [x] 10.3 Re-rank interview evidence by question overlap and evidence kind, with Rust unit tests in CI (Requirement: Interview evidence is ranked for the question).
      files: src-tauri/src/rag/interview_rerank.rs, src-tauri/src/commands/intelligence_commands.rs
- [x] 10.4 Prefer matching prepared Q&A answers as primary wording without forcing them onto tangential questions or overriding grounding (Requirement: Prepared Q&A answers are preferred when they fit).
      files: src-tauri/src/rag/prompt_builder.rs, tests/prepared-qa-retrieval.test.mjs
- [x] 10.5 Track answer-use history and prefer materially different supported examples without inventing (Requirement: Answer-use history reduces repetition).
      files: src-tauri/src/rag/prompt_builder.rs, tests/interview-answer-history.test.mjs
- [x] 10.6 Grounding rules that separate implemented from proposed work and acknowledge weak evidence (Requirement: Guidance never overstates the evidence).
      files: src-tauri/src/rag/prompt_builder.rs, tests/grounded-what-to-say.test.mjs
- [ ] 10.7 Port only the behavior that 10.1 and 10.2 show materially improves grounding, with Rust unit tests and Node prompt-content tests; no Python architecture is ported (Requirement: Port decisions are evidence-based and recorded).
      files: src-tauri/src/rag/prompt_builder.rs, src-tauri/src/intelligence/question_detector.rs, tests/grounded-what-to-say.test.mjs

## 11. Decommissioning

- [x] 11.1 Hearsay PyAudioWPatch/sounddevice capture, faster-whisper/CTranslate2 packaging, and CUDA diagnostics removed from the active tree by the foundation import and no longer developed.
      files: docs/FOUNDATION_MIGRATION.md
- [x] 11.2 Retire the Hearsay subscriber/extension-host contracts by removing their canonical requirements in this change's deltas.
      files: openspec/changes/nexq-foundation-pivot/specs/transcript-events/spec.md, openspec/changes/nexq-foundation-pivot/specs/extension-host-import-boundary/spec.md, openspec/changes/nexq-foundation-pivot/specs/live-only-session/spec.md, openspec/changes/nexq-foundation-pivot/specs/low-latency-transcription/spec.md
- [x] 11.3 Pre-pivot branches, tags, and history retained; the foundation import is the only commit that removed runtime files.
      files: docs/FOUNDATION_MIGRATION.md
- [ ] 11.4 [cleanup] After group 10 closes, mark `hearsay-interview-copilot` superseded/reference-only (repository description plus a README migration notice pointing here) and record it in the migration doc.
      files: docs/FOUNDATION_MIGRATION.md

## 12. Verification

- [ ] 12.1 [e2e] `openspec validate nexq-foundation-pivot --strict` passes, `npm test` and the CI `cargo test` targets pass, and the required Windows check, installer, native-audio, and Playwright workflows are green on the pull request.
