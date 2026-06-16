// Platform-agnostic key/value storage abstraction.
//
// The prototype called `localStorage` directly. In the cross-platform app this
// is injected per platform: localStorage (web), expo-secure-store / MMKV (native),
// or a PowerSync/SQLite-backed adapter. Methods may be sync or async; callers await.

export interface KeyValueStore {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/** In-memory store — useful for tests and SSR. */
export function createMemoryStore(seed?: Record<string, string>): KeyValueStore {
  const map = new Map<string, string>(seed ? Object.entries(seed) : undefined);
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}
