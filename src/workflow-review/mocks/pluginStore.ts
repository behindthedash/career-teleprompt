const stores = new Map<string, Map<string, unknown>>();

export interface StoreOptions {
  autoSave?: boolean;
  defaults?: Record<string, unknown>;
}

export class Store {
  private readonly data: Map<string, unknown>;

  constructor(path: string, options: StoreOptions = {}) {
    const existing = stores.get(path);
    this.data = existing ?? new Map(Object.entries(options.defaults ?? {}));
    stores.set(path, this.data);
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.data.has(key) ? this.data.get(key) : null) as T | null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async reset(): Promise<void> {
    this.data.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async keys(): Promise<string[]> {
    return [...this.data.keys()];
  }

  async values<T>(): Promise<T[]> {
    return [...this.data.values()] as T[];
  }

  async entries<T>(): Promise<Array<[string, T]>> {
    return [...this.data.entries()] as Array<[string, T]>;
  }

  async length(): Promise<number> {
    return this.data.size;
  }

  async save(): Promise<void> {}
  async reload(): Promise<void> {}
}

export async function load(path: string, options?: StoreOptions): Promise<Store> {
  return new Store(path, options);
}
