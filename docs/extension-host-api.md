# Hearsay Extension Host API

Hearsay exposes a deliberately small Python surface for in-process consumers that need finalized transcript events and session policy values without importing the desktop application stack.

## Supported public imports

Use `hearsay.events` for finalized transcript events and subscriptions:

```python
from hearsay.events import (
    TranscriptEvent,
    TranscriptSource,
    TranscriptSubscription,
    register_transcript_handler,
)
```

Use `hearsay.host` for session-facing output and transcription policy contracts:

```python
from hearsay.host import (
    LIVE_TRANSCRIPTION_PROFILE,
    NORMAL_TRANSCRIPTION_PROFILE,
    SessionOutputMode,
    TranscriptionHealth,
    TranscriptionMetrics,
    TranscriptionProfile,
)
```

Importing these modules is side-effect free. It does not create tkinter/customtkinter windows, open audio devices, start recording, load a Whisper model, or start subscriber worker threads. A subscriber worker starts only when `register_transcript_handler(...)` is called.

## Registering a transcript consumer

```python
from hearsay.events import TranscriptEvent, TranscriptSource, register_transcript_handler


def on_remote_transcript(event: TranscriptEvent) -> None:
    print(event.session_id, event.sequence, event.text)


subscription = register_transcript_handler(
    "example-consumer",
    on_remote_transcript,
    sources=[TranscriptSource.REMOTE],
)

try:
    # Run the consumer while Hearsay publishes finalized events in this process.
    ...
finally:
    subscription.close()
```

Delivery is bounded and isolated per subscriber. Consumers should retain the returned `TranscriptSubscription` and call `close()` (or `unregister()`) when finished.

For live external workflows, `SessionOutputMode.LIVE_ONLY` and `LIVE_TRANSCRIPTION_PROFILE` are the stable policy values to use when configuring a Hearsay-hosted session. Ordinary Hearsay recording continues to use `SessionOutputMode.PERSISTED` and `NORMAL_TRANSCRIPTION_PROFILE` by default.

## Unsupported application internals

External integrations should not depend on implementation modules such as:

- `hearsay.app`
- `hearsay.audio.*`
- `hearsay.ui.*`
- `hearsay.output.*`
- `hearsay.transcription.*`
- `hearsay.events.dispatcher`
- private application queues, recorder objects, tkinter widgets, or pipeline objects

Those modules may change as the desktop application evolves and are not compatibility contracts for downstream consumers. `TranscriptEventDispatcher` remains lazily reachable from `hearsay.events` only to preserve compatibility with existing Hearsay code; external consumers should use the event/subscription API above instead.

## Dependency boundary

The public host surface depends only on Hearsay's own core package contracts. Consumer-specific retrieval, vector, database, or LLM dependencies do not belong in Hearsay. In particular, integrations must keep packages such as FastEmbed, psycopg, pgvector, OpenAI/Anthropic SDKs, and Interview Copilot dependencies in the consuming application.
