## 1. Public API
- [ ] 1.1 Define handler protocol/callable contract.
- [ ] 1.2 Implement register/unregister and source filters.
- [ ] 1.3 Return a subscription handle with diagnostics.

## 2. Isolation
- [ ] 2.1 Add bounded per-subscriber queues/workers.
- [ ] 2.2 Implement non-blocking overflow policy.
- [ ] 2.3 Isolate handler exceptions.

## 3. Tests/docs
- [ ] 3.1 Add slow, failing, filtered, and unregister tests.
- [ ] 3.2 Add a minimal generic external-consumer example.
