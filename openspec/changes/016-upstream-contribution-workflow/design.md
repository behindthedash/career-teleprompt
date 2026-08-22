## Decisions

### D1. Upstream is authoritative for base Hearsay
Fork-specific features layer on top; sync branches merge/rebase upstream changes into the fork, never force-push upstream history.

### D2. Generic contributions branch from upstream-compatible state
A candidate upstream PR contains the smallest generic change plus its tests/docs, not a merge of the entire copilot fork.

### D3. Personal-data scan is mandatory
No resume, project notes, corpus paths, connection strings, transcripts, machine-specific logs, or interview fixtures from real sessions may enter an upstream branch.

### D4. Upstream rejection does not block the fork
Maintain compatibility adapters locally when a useful generic seam is not accepted.

## Deliverable
A concise `CONTRIBUTING_FORK.md`/docs section with commands and checklist.
