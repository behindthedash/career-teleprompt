## Why

A separate downstream application needs to depend on Hearsay's supported transcript-event/session API as a library. Today Hearsay is primarily a desktop application, so the extension surface needs an explicit import boundary that does not accidentally start tray UI/audio work or require downstream application packages.

## What Changes

- Define the supported host import surface for transcript events/subscriptions and session/profile contracts.
- Ensure importing that surface has no application startup, tray, audio-capture, Whisper-model-load, or recording side effects.
- Keep the supported host API dependent only on Hearsay's core dependency set.
- Make downstream applications own their own RAG/vector/database/LLM/UI dependencies and packaging; Hearsay does not provide a consumer-enabled build flavor.
- Add an external-consumer smoke test that imports and uses public contract types without importing private application internals.

## Capabilities

### New Capabilities
- `extension-host-import-boundary`: side-effect-free supported Python import surface for downstream Hearsay consumers.

## Impact

May require reorganizing public exports and separating pure contract modules from application startup modules. No domain-specific consumer functionality is added.

## Product-Level Merge Gate

A minimal external Python process can import the documented Hearsay event/session contracts with only Hearsay core requirements installed, without launching UI/audio/model work, and without importing any interview/RAG/vector/database package.
