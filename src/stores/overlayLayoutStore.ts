import { create } from "zustand";

export type OverlayLayoutMode = "split" | "ai" | "transcript" | "teleprompt";

interface OverlayLayoutState {
  layoutMode: OverlayLayoutMode;
  setLayoutMode: (layoutMode: OverlayLayoutMode) => void;
  cycleLayout: () => void;
  toggleTeleprompter: () => void;
}

export const useOverlayLayoutStore = create<OverlayLayoutState>((set, get) => ({
  layoutMode: "split",
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  cycleLayout: () => {
    const mode = get().layoutMode;
    if (mode === "teleprompt") set({ layoutMode: "split" });
    else if (mode === "split") set({ layoutMode: "ai" });
    else if (mode === "ai") set({ layoutMode: "transcript" });
    else set({ layoutMode: "split" });
  },
  toggleTeleprompter: () =>
    set({ layoutMode: get().layoutMode === "teleprompt" ? "split" : "teleprompt" }),
}));
