# Epic 002 — Speech-Following Teleprompter

## Business Objective

Provide prepared interview talking points that follow the user's own speech naturally, while coexisting with dynamic retrieval cues from the Interview Copilot.

This is a consumer feature built on Hearsay's `Local` transcript events. Hearsay itself remains unaware of scripts, talking points, alignment state, or interview presentation behavior.

## Host Dependencies

- Hearsay finalized `Local` transcript events through the supported subscriber API
- Hearsay low-latency live transcription profile
- optional Hearsay topmost-window primitives where they reduce duplicate Windows/tkinter infrastructure

## Architectural Principles

1. **Prepared content is not a transcript.** It is structured user-authored guidance with stable section identity.
2. **Follow meaning, not exact words.** Alignment tolerates paraphrasing, skipped phrases, pauses, and restarts.
3. **Only Local speech advances prepared content.** Interviewer/Remote speech never moves the teleprompter.
4. **Manual control always wins.** Next/previous/jump can override automatic alignment immediately.
5. **Dynamic cues and prepared material remain separate models.** They are coordinated only in the presentation layer.
6. **The user should glance, not read.** UI emphasizes the current point and nearby context rather than a wall of scrolling text.

## Feature Decomposition

### 008 — Teleprompter Content Model
Load Markdown/outlines into stable ordered sections with source provenance and reload behavior.

### 009 — Local Speech Alignment
Consume `Local` transcript events and maintain confidence-based alignment to prepared sections, including hold/recovery behavior.

### 010 — Speech-Following Teleprompter UI
Render prepared content in a compact topmost camera-adjacent consumer window with manual navigation and safe background updates.

### 011 — Cue/Teleprompter Coexistence
Coordinate prepared teleprompter presentation with dynamic interview cues without conflating their state or causing disruptive focus/layout churn.

## Non-Goals

- No changes to Hearsay audio capture/transcription semantics.
- No Remote-speech advancement.
- No fixed-speed scrolling as the primary behavior.
- No requirement to read a script verbatim.
- No merging RAG results into the prepared-content source document.

## Acceptance Journey

1. User loads a prepared interview outline.
2. Consumer subscribes to Hearsay `Local` transcript events.
3. As the user answers naturally, the current section follows with useful confidence.
4. Pauses or paraphrases do not cause runaway advancement.
5. Skipping ahead recovers to the new section.
6. Manual next/previous/jump immediately overrides auto-follow.
7. A dynamic RAG cue can appear without corrupting teleprompter alignment state.
8. Interviewer `Remote` speech does not advance prepared content.

## Dependencies

`008` precedes `009`; `010` consumes both; `011` also depends on the Interview Copilot cue model from Epic 001.
