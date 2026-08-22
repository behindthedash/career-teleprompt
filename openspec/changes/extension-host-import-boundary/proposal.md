## Why

A separate consumer repository must be able to import Hearsay's supported event/session contracts without launching the desktop app shell or depending on private modules.

## What Changes

- Define documented public modules for event/subscription/session contracts.
- Ensure imports are side-effect-free.
- Keep downstream RAG/vector/database/LLM dependencies out of Hearsay.
- Add subprocess smoke tests for the supported import surface.

## Capabilities

### Modified Capabilities
- `extension-host-import-boundary`
