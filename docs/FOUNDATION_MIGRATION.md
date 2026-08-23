# Foundation migration

The active application foundation in this branch is imported from NexQ commit
`1ce1524c122df509f231c521a07ada95bfde2d88`.

The pre-pivot Python Hearsay implementation remains recoverable in Git history.
Career Teleprompt repository governance (`.github`, `.worktrail`, `AGENTS.md`,
`CLAUDE.md`), OpenSpec artifacts, and migration documentation are retained across
the runtime replacement.

Upstream deployment/release workflows, internal planning artifacts, Playwright captures,
and the NexQ marketing website are intentionally not imported. Career Teleprompt defines
its own CI, release, and branding policy.

The importer validates the platform-independent frontend before committing the tree.
Windows-native Rust validation is performed by Career Teleprompt CI on `windows-latest`,
matching the application's supported platform and NexQ's upstream CI contract.
