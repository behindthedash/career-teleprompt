## 1. Public import surface
- [ ] 1.1 Inventory imports required for `hearsay.events` and supported session/profile contracts; identify application-startup side effects.
- [ ] 1.2 Refactor pure public contract types/exports so importing them does not instantiate UI, audio, recording, or Whisper components.
- [ ] 1.3 Document the supported external import/registration surface and explicitly mark private internals as unsupported.

## 2. Dependency boundary
- [ ] 2.1 Remove any plan/build references that make interview/RAG/vector/database packages Hearsay dependencies or Hearsay build flavors.
- [ ] 2.2 Add a regression test proving public host imports succeed with the base Hearsay dependency set only.

## 3. External-consumer verification
- [ ] 3.1 Add a subprocess smoke test that imports public extension contracts and asserts no tray/audio/model startup markers occur.
- [ ] 3.2 Add a minimal synthetic external-consumer example that registers against the supported event API without importing private application internals.
- [ ] 3.3 Run existing Hearsay startup/recording regression tests after the import refactor.
