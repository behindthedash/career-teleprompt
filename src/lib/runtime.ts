import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type UnlistenFn } from "@tauri-apps/api/event";

export interface RuntimeEvent<T> {
  event: string;
  id: number;
  payload: T;
}

export interface CareerTelepromptTestRuntime {
  invoke?: <T = unknown>(
    command: string,
    args?: Record<string, unknown>,
  ) => Promise<T> | T;
  listen?: <T = unknown>(
    event: string,
    handler: (event: RuntimeEvent<T>) => void,
  ) => Promise<UnlistenFn> | UnlistenFn;
}

declare global {
  interface Window {
    __CAREER_TELEPROMPT_TEST_RUNTIME__?: CareerTelepromptTestRuntime;
  }
}

function getTestRuntime(): CareerTelepromptTestRuntime | undefined {
  return typeof window !== "undefined"
    ? window.__CAREER_TELEPROMPT_TEST_RUNTIME__
    : undefined;
}

export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const runtime = getTestRuntime();
  if (runtime?.invoke) {
    return await runtime.invoke<T>(command, args);
  }
  return tauriInvoke<T>(command, args);
}

export async function listen<T>(
  event: string,
  handler: (event: RuntimeEvent<T>) => void,
): Promise<UnlistenFn> {
  const runtime = getTestRuntime();
  if (runtime?.listen) {
    return await runtime.listen<T>(event, handler);
  }
  return tauriListen<T>(event, (tauriEvent) => {
    handler({
      event: tauriEvent.event,
      id: tauriEvent.id,
      payload: tauriEvent.payload,
    });
  });
}
