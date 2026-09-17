## REMOVED Requirements

### Requirement: Live-only output is a generic session policy
**Reason**: Hearsay session and transcript-file mechanics were retired by the NexQ foundation import; meeting persistence is now the adopted foundation's behavior.
**Migration**: None. Any future no-save meeting behavior is specified against the adopted foundation's meeting persistence, not this contract.

### Requirement: Persisted output remains the normal default
**Reason**: The Hearsay markdown transcript writer no longer exists.
**Migration**: None. Meeting transcripts persist through the adopted foundation's meeting database.

### Requirement: Output policy is visible and explicit
**Reason**: Tied to the retired Hearsay tray/live-view session UI.
**Migration**: None.

### Requirement: Live-only does not mean delete-after-write
**Reason**: Tied to the retired Hearsay transcript-file writer.
**Migration**: None. Teleprompter generated content follows the ephemeral-by-default rule in the teleprompter content model.

### Requirement: Teardown preserves the selected policy
**Reason**: Tied to the retired Hearsay session lifecycle.
**Migration**: None.
