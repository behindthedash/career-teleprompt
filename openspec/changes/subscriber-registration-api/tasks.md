## 1. Public API
- [x] 1.1 Define handler protocol/callable contract.
- [x] 1.2 Implement register/unregister and source filters.
- [x] 1.3 Return a subscription handle with diagnostics.

## 2. Isolation
- [x] 2.1 Add bounded per-subscriber queues/workers.
- [x] 2.2 Implement non-blocking overflow policy.
- [x] 2.3 Isolate handler exceptions.

## 3. Tests/docs
- [x] 3.1 Add slow, failing, filtered, and unregister tests.
- [x] 3.2 Add a minimal generic external-consumer example.
