## REMOVED Requirements

### Requirement: Transcription cadence is selectable per session
**Reason**: Hearsay's windowed faster-whisper pipeline was retired by the NexQ foundation import; the adopted foundation provides streaming STT providers instead of batch cadences.
**Migration**: None. Latency behavior is a property of the selected STT provider in the adopted foundation.

### Requirement: Shorter windows preserve overlap and final-flush correctness
**Reason**: The overlap/dedup windowing this described no longer exists.
**Migration**: None.

### Requirement: Live lag/backpressure is observable
**Reason**: Tied to the retired Hearsay transcription queue.
**Migration**: None. Any live-lag requirement is re-specified against the adopted foundation only if the hardware acceptance matrix records a gap.

### Requirement: Healthy live load does not silently drop eligible windows
**Reason**: Tied to the retired Hearsay transcription queue.
**Migration**: None.

### Requirement: Status messaging reflects the active profile
**Reason**: Tied to the retired Hearsay tray/live-view status messaging.
**Migration**: None.
