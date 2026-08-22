# Personal Knowledge Base Backend Addendum

**Date:** 2026-08-22  
**Applies to:** Epic 001 knowledge/retrieval features and Epic 003 dependency/upstream boundaries

## Direction

The interview corpus can become the first curated domain of a broader personal knowledge base. Hearsay should therefore not hard-code its knowledge layer to one local vector representation.

OpenSpec change `018-personal-knowledge-store-backends` introduces a provider contract with:

- a local/offline SQLite + NumPy vector provider;
- an optional private PostgreSQL + pgvector provider;
- collection/namespace isolation;
- provenance and `experience_status` preservation;
- collection-bound embedding model/dimension metadata;
- atomic document re-indexing;
- explicit remote health/degraded state;
- secret/TLS requirements.

## Product Boundary

This does **not** turn Hearsay into a cloud service. Normal transcription remains local and independent. The PostgreSQL database is an optional durable knowledge backend and can later be reused by other personal tools.

## Suggested Initial Collections

- `career` — resume facts, project narratives, skills, measurable outcomes, architecture decisions.
- `interview-clearlake` — role/company-specific preparation and hypothetical solution bridges.
- `personal-notes` — future general personal KB material, excluded from interview retrieval unless explicitly selected.

The separation matters: hypothetical target-company material must never be silently retrieved as implemented career experience.
