## REMOVED Requirements

### Requirement: Finalized speech is exposed as generic transcript events
**Reason**: The Hearsay Python event dispatcher was retired by the NexQ foundation import. Transcript state is now an in-application store fed by the adopted foundation's STT pipeline.
**Migration**: None for external consumers; in-app consumers such as the speech follower read the corrected `You`/`Them` transcript state directly.

### Requirement: Subscription registration is explicit and consumer-neutral
**Reason**: The Python registration API no longer exists.
**Migration**: None.

### Requirement: Events preserve finalized order within a session
**Reason**: Tied to the retired dispatcher.
**Migration**: None. Ordering is a property of the adopted foundation's transcript store.

### Requirement: Recording sessions are isolated
**Reason**: Tied to the retired Hearsay session identity model.
**Migration**: None. Meeting isolation is provided by the adopted foundation's meeting model.

### Requirement: Subscriber failure cannot block core transcription
**Reason**: There are no out-of-process subscribers after the pivot.
**Migration**: None.

### Requirement: Subscriber health is observable without transcript retention
**Reason**: Tied to the retired subscriber layer.
**Migration**: None.

### Requirement: Subscription lifecycle is explicit
**Reason**: Tied to the retired subscriber layer.
**Migration**: None.

### Requirement: No subscribers preserves normal behavior
**Reason**: Tied to the retired subscriber layer.
**Migration**: None.
