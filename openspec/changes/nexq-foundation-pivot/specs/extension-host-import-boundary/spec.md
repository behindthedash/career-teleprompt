## REMOVED Requirements

### Requirement: Public extension contracts import without application startup
**Reason**: The Python Hearsay runtime and its public Python import surface were retired by the NexQ foundation import; there is no Python host to import.
**Migration**: None. Downstream behavior lives inside the single Tauri/React application. Pre-pivot code remains in Git history.

### Requirement: Public host imports require only Hearsay core dependencies
**Reason**: The Python host API no longer exists after the foundation import.
**Migration**: None. The application's own TypeScript/Rust modules are the only integration surface.

### Requirement: Downstream dependencies remain outside Hearsay packaging
**Reason**: Hearsay packaging (PyInstaller/Inno Setup) was replaced by the Tauri installer pipeline.
**Migration**: None. RAG, LLM, and interview dependencies are part of the adopted foundation by design.

### Requirement: Private internals are outside the supported contract
**Reason**: The tkinter/recorder/Whisper internals this requirement protected were removed with the Python runtime.
**Migration**: None.

### Requirement: Import behavior is regression-tested externally
**Reason**: The subprocess import smoke test guarded a Python API that no longer exists.
**Migration**: None. CI now runs the Node tests, typecheck, frontend build, and Rust checks of the adopted foundation.
