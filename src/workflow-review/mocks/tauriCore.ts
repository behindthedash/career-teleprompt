import { invoke as invokeBackend } from "./backend";

export function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invokeBackend<T>(command, args);
}

export function isTauri(): boolean {
  return false;
}

export function convertFileSrc(filePath: string): string {
  return filePath;
}

export function transformCallback(): number {
  return 0;
}

export class Resource {
  readonly rid = 0;
  async close(): Promise<void> {}
}

export class Channel<T = unknown> {
  onmessage: (message: T) => void = () => {};
  readonly id = 0;
}
