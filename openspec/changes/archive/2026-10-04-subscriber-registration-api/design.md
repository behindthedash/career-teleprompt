## Decisions

### D1. Explicit registration, not dynamic discovery
Representative API:

```python
subscription = register_transcript_handler(
    name="consumer-name",
    handler=handler,
    sources={"Remote"},
    queue_size=100,
)
```

The exact names may vary; no entry-point discovery, marketplace, webhook, or network transport is introduced.

### D2. One bounded queue per subscriber
Each subscriber gets an isolated bounded queue and stoppable worker. A slow consumer cannot block the publisher.

### D3. Overflow drops extension delivery, never core work
When full, the dispatcher records the overflow and drops the incoming extension event according to documented policy.

### D4. Lifecycle is explicit
Registration returns a subscription handle that supports close/unregister and exposes diagnostics.

## Expected Files
- `src/hearsay/events/subscriptions.py`
- dispatcher integration/tests
