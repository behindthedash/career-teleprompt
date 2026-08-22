# Hearsay Knowledge Store Backend Addendum

**Date:** 2026-08-22  
**Applies to:** Epic 001 knowledge/retrieval features and Epic 003 dependency/upstream boundaries

## Direction

Hearsay's interview corpus should not be hard-wired to one local vector representation. OpenSpec change `018-knowledge-store-provider-backends` introduces a Hearsay-scoped storage abstraction with:

- a local/offline SQLite + NumPy vector provider;
- an optional private PostgreSQL + pgvector provider;
- explicit retrieval-scope/collection isolation where Hearsay needs it;
- provenance and `experience_status` preservation;
- collection-bound embedding model/dimension metadata;
- atomic document re-indexing;
- explicit remote health/degraded behavior;
- secret and TLS requirements.

## Product Boundary

This is a backend choice for Hearsay's own knowledge indexing and retrieval. It does **not** define a generalized personal knowledge-base platform, service, API, or schema for unrelated future applications.

The PostgreSQL provider may be hosted on infrastructure the user controls and its schema should avoid unnecessary coupling, but future reuse is only a design consideration. If multiple unrelated applications later need shared knowledge ownership or a common API, that should become a separate project with its own specification rather than expanding Hearsay's responsibilities by assumption.

## Hearsay Retrieval Scopes

Initial Hearsay use may distinguish:

- `career` — implemented resume/project evidence, skills, outcomes, and architecture decisions;
- target-specific interview preparation — company/role notes and hypothetical solution bridges.

The separation exists to protect retrieval correctness: hypothetical target-company material must never be silently surfaced as implemented career experience.

No unrelated personal-data domains are defined by this addendum.
