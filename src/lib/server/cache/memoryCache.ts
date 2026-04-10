type Entry<T> = { value: T; expiresAt: number };

export class MemoryCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  getValid(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) return undefined;
    return e.value;
  }

  /** Último valor guardado aunque esté vencido (stale-while-error). */
  getStale(key: string): T | undefined {
    return this.store.get(key)?.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
