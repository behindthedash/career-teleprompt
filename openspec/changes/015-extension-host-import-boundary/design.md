## Context

Hearsay was built as a desktop application, while the new architecture introduces external Python consumers. The public extension contract must therefore be importable independently of application startup.

## Decisions

### D1. Public contracts live in side-effect-free modules
Keep event dataclasses, subscription types, registration interfaces/factories, and supported session/profile models in modules that do not instantiate `HearsayApp`, `SystemTrayIcon`, `AudioRecorder`, or Whisper engines at import time.

### D2. Consumer packages are not Hearsay extras
Do not create `requirements-copilot.txt`, a copilot-enabled Hearsay installer, or Hearsay imports of FastEmbed/psycopg/pgvector/LLM SDKs. The downstream project owns those packages.

### D3. Application wiring may implement the contracts
The Hearsay desktop application can create the dispatcher/session host and expose supported registration to consumers, but public contract modules must not import the app shell back into themselves.

### D4. A consumer smoke test protects the boundary
Add a subprocess/import test that imports documented public modules with only the Hearsay dependency set and asserts no application/audio worker is started as an import side effect.

### D5. Private internals remain private
The external contract does not promise stability for `HearsayApp._transcript_queue`, tkinter widgets, `TranscriptionPipeline` internals, or Whisper-specific implementation details.

### D6. Packaging remains one Hearsay product
The normal Hearsay build remains the host application. A separate consumer application may depend on the Python package/source and build its own executable; Hearsay does not bundle that consumer.

## Expected Files
- `src/hearsay/events/__init__.py`
- pure public contract/session modules as needed
- startup/app imports refactored where side effects leak into public modules
- package/export documentation
- subprocess/import boundary tests
