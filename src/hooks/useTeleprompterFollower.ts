import { useEffect, useMemo } from "react";
import { useTeleprompterStore } from "../stores/teleprompterStore";
import { useTranscriptStore } from "../stores/transcriptStore";
import { alignTranscript, documentTokens } from "../teleprompter/follower";

/**
 * Feed NexQ's corrected "User" transcript state into the teleprompter follower.
 *
 * We derive from the store rather than appending raw STT events so interim/correction updates are
 * naturally replaced before alignment. The alignment engine itself is monotonic and will hold
 * position when confidence is insufficient.
 */
export function useTeleprompterFollower() {
  const segments = useTranscriptStore((state) => state.segments);
  const document = useTeleprompterStore((state) => state.document);
  const followingEnabled = useTeleprompterStore((state) => state.followingEnabled);

  const expectedTokens = useMemo(
    () => (document ? documentTokens(document) : []),
    [document],
  );

  const userTranscript = useMemo(
    () =>
      segments
        .filter((segment) => segment.speaker === "User")
        .slice(-16)
        .map((segment) => segment.text)
        .join(" "),
    [segments],
  );

  useEffect(() => {
    if (!document || !followingEnabled || expectedTokens.length === 0) return;

    const state = useTeleprompterStore.getState();
    const result = alignTranscript(
      expectedTokens,
      userTranscript,
      state.cursorTokenIndex,
    );
    state.applyFollowerAlignment(result);
  }, [document, expectedTokens, followingEnabled, userTranscript]);
}
