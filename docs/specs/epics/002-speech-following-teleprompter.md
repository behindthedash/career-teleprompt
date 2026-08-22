# Epic: Speech-Following Teleprompter

**Epic ID:** 002-speech-following-teleprompter  
**Date:** 2026-08-22  
**Status:** Proposed  
**Product objective:** Add an optional teleprompter mode that follows the local speaker's microphone transcription through prepared talking-point text, keeping the current passage near the webcam while tolerating paraphrasing, pauses, skipped sections, and restarts.

## Business Objective

Prepared interview material is useful only if it remains easy to glance at while speaking naturally. Fixed-speed teleprompters force the user to match the scroll. A speech-following mode should instead use the local microphone transcript to estimate where the user is in prepared material and advance the view accordingly.

This feature complements the live interview copilot: remote speech determines what evidence is relevant; local speech can optionally keep a prepared answer outline synchronized while the user speaks.

## Why This Epic Exists

Hearsay already transcribes the microphone separately from remote/system audio. That makes it possible to implement speech tracking without a second microphone capture stack. The missing capability is fuzzy alignment between the local transcript and prepared text plus a teleprompter-oriented UI.

The feature should not require verbatim reading. Interview answers are conversational and frequently diverge from preparation material.

## Product Principle

> **Follow the speaker; never force the speaker to follow the scroll.**

## Architectural Principles

### 1. Reuse Local transcript events

Consume `Local` transcript events from the generic extension boundary established in Epic 001. Do not access microphone devices independently.

### 2. Track semantic position, not exact words only

Prepared content should be segmented into logical passages. Alignment may use fuzzy lexical matching first and semantic similarity where needed so natural paraphrases do not lose the speaker's place.

### 3. Advancement is confidence-based

Low-confidence alignment should hold position rather than jump unpredictably. Manual next/previous/jump controls must always be available.

### 4. Support outline mode as a first-class format

The best interview use may be structured bullets rather than a verbatim speech. The teleprompter should support both paragraph scripts and concise talking-point sections.

### 5. Keep camera proximity configurable

The window should support narrow near-camera placement, adjustable width/font/opacity, always-on-top behavior, and keyboard controls while another application has focus.

### 6. Do not couple teleprompter content to RAG

Speech-following prepared content and dynamically retrieved interview cues are separate projections. They may be shown together later, but neither subsystem should depend on the other to function.

## Privacy and Trust Invariants

- Local speech alignment runs locally in local mode.
- Teleprompter scripts are not transmitted to a provider unless the user explicitly enables a provider that requires them.
- The UI clearly indicates whether it is following local speech or paused/manual.
- Low confidence does not cause uncontrolled jumps.

## Non-Goals

- Voice cloning or generated spoken answers.
- Enforcing verbatim script adherence.
- Replacing the live retrieval/cue system from Epic 001.
- Building a video recording studio or broadcast teleprompter suite.
- Automatically scrolling based on the interviewer's remote speech.

## Feature Decomposition

### Feature 1 — Prepared Content Model and Loader

Define script/outline formats, logical sections, anchors, and persistence behavior.

**Proposed OpenSpec change:** `008-teleprompter-content-model`

### Feature 2 — Local Speech Alignment Engine

Align finalized Local transcript text to prepared sections using fuzzy matching with explicit confidence and recovery behavior.

**Proposed OpenSpec change:** `009-local-speech-alignment`

### Feature 3 — Teleprompter Camera Overlay

Create a narrow, always-on-top view with active passage positioning, font/width/opacity controls, keyboard navigation, pause, and jump-to-section.

**Proposed OpenSpec change:** `010-speech-following-teleprompter-ui`

### Feature 4 — Interview Cue + Teleprompter Coexistence

Define how dynamic retrieval cues and prepared speech-following material can coexist without competing for screen space or focus.

**Proposed OpenSpec change:** `011-cue-teleprompter-coexistence`

## Existing Components / Reuse Boundaries

- Reuse Epic 001 transcript event extension boundary.
- Reuse Hearsay's Local source labeling and echo suppression.
- Reuse `safe_after` for UI updates.
- Keep the teleprompter as an independent UI projection from `LiveTranscriptWindow`.

## Dependencies and Sequencing

1. Epic 001 Feature 1 (Transcript Event Extension Boundary) is a prerequisite.
2. Prepared Content Model can begin independently.
3. Local Speech Alignment depends on prepared content + transcript events.
4. Teleprompter UI can be developed with synthetic alignment events in parallel.
5. Coexistence work follows a usable cue overlay and teleprompter UI.

## Success Metrics

- User can speak naturally and the active passage follows without requiring fixed pacing.
- Short pauses do not advance the prompt.
- Repeating/restarting a sentence does not skip forward incorrectly.
- Skipping a section can recover to the new section within an acceptable number of finalized utterances.
- Manual controls recover immediately when alignment confidence is low.
- Zoom/Teams can retain keyboard/mouse focus during normal use.

## Acceptance Journey

```text
user loads interview talking points
  -> starts speech-following mode
    -> Local transcript events arrive from Hearsay
      -> alignment engine identifies the active section
        -> teleprompter keeps that passage near the camera
          -> user paraphrases rather than reading verbatim
            -> alignment remains stable
              -> user skips a section
                -> engine recovers to the new section
                  -> low-confidence moment holds instead of jumping
                    -> user can pause/jump manually at any time
```

## Risks

- **Fuzzy matching drifts on paraphrase.** Mitigation: section-level anchors, semantic fallback, confidence threshold, manual recovery.
- **Two overlays become distracting.** Mitigation: combined-layout experiments only after both single-purpose views work well.
- **Local transcription latency makes following feel sluggish.** Mitigation: reuse latency work from Epic 001 and measure before designing around assumptions.
- **UI steals focus from Zoom.** Mitigation: no-focus updates and global/manual shortcuts designed explicitly for meeting use.

## Open Questions for Feature Pickup

1. Should prepared content use Markdown headings as section boundaries?
2. How should confidence be calculated when the user summarizes a bullet rather than speaking its words?
3. Should the active passage auto-center, auto-scroll by section, or advance discretely?
4. What keyboard shortcuts are safe and unlikely to conflict with Zoom/Teams?
5. Is a combined cue + teleprompter view better than two independently positionable windows?
