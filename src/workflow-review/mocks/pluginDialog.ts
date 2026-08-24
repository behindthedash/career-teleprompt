export interface OpenDialogOptions {
  multiple?: boolean;
  directory?: boolean;
  filters?: unknown[];
}

export async function open(_options?: OpenDialogOptions): Promise<null> {
  return null;
}

export async function save(): Promise<null> {
  return null;
}

export async function message(): Promise<void> {}
export async function ask(): Promise<boolean> { return true; }
export async function confirm(): Promise<boolean> { return true; }
