import { emit as emitBackend, listen as listenBackend } from "./backend";

export type UnlistenFn = () => void;

export interface Event<T> {
  event: string;
  id: number;
  payload: T;
}

export async function listen<T>(
  event: string,
  handler: (event: Event<T>) => void,
): Promise<UnlistenFn> {
  return listenBackend(event, handler as (event: { event: string; id: number; payload: unknown }) => void);
}

export async function once<T>(
  event: string,
  handler: (event: Event<T>) => void,
): Promise<UnlistenFn> {
  let unlisten: UnlistenFn = () => {};
  unlisten = listenBackend(event, (message) => {
    unlisten();
    handler(message as Event<T>);
  });
  return unlisten;
}

export async function emit(event: string, payload?: unknown): Promise<void> {
  emitBackend(event, payload);
}

export async function emitTo(
  _target: unknown,
  event: string,
  payload?: unknown,
): Promise<void> {
  emitBackend(event, payload);
}
