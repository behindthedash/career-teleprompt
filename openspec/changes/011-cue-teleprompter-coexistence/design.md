## Decisions

### D1. Coordinate presentation, not domain state
`InterviewCue` and teleprompter alignment remain independent. A small presentation coordinator owns only window placement/visibility policy.

### D2. Independent windows are the default
Users may position each window separately. A stacked mode is an optional convenience after both single-purpose windows work.

### D3. New cue arrival may accent, not seize focus
Use a brief visual state change/badge; never force the cue window foreground.

### D4. Teleprompter content remains stable while cue changes
Retrieval churn cannot reposition prepared content. Alignment events cannot replace the active dynamic cue.

## Expected Files
- `src/hearsay/ui/interview_layout.py`
- integration wiring in `app.py`
