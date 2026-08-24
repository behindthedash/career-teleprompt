import type { FollowerStatus } from "./follower";

export interface PendingAdvanceState {
  hasPendingDocument: boolean;
  followingEnabled: boolean;
  followerStatus: FollowerStatus | "idle";
  confidence: number;
  cursorPosition: number;
  totalTokens: number;
}

const MIN_COMPLETION_CONFIDENCE = 0.72;

/**
 * Advance only after the speech follower has confidently reached the final token.
 * Uncertain/lost alignment, paused following, or merely being near the end must hold.
 */
export function shouldActivatePendingAnswer(state: PendingAdvanceState): boolean {
  return (
    state.hasPendingDocument &&
    state.followingEnabled &&
    state.totalTokens > 0 &&
    state.followerStatus === "following" &&
    state.confidence >= MIN_COMPLETION_CONFIDENCE &&
    state.cursorPosition >= state.totalTokens - 1
  );
}
