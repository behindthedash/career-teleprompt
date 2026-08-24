import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const workflowE2E = process.env.CAREER_TELEPROMPT_E2E === "1";

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(workflowE2E
        ? {
            "@tauri-apps/api/core": path.resolve(__dirname, "./src/workflow-review/mocks/tauriCore.ts"),
            "@tauri-apps/api/event": path.resolve(__dirname, "./src/workflow-review/mocks/tauriEvent.ts"),
            "@tauri-apps/plugin-store": path.resolve(__dirname, "./src/workflow-review/mocks/pluginStore.ts"),
            "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./src/workflow-review/mocks/pluginDialog.ts"),
            "@tauri-apps/plugin-fs": path.resolve(__dirname, "./src/workflow-review/mocks/pluginFs.ts"),
          }
        : {}),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
