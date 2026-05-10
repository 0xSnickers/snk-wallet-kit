import type { PersistedSession } from "./core";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

export function createDefaultStorage(): StorageAdapter {
  if (!isBrowser()) {
    return createMemoryStorage();
  }

  return window.localStorage;
}

export function readPersistedSession(
  storage: StorageAdapter,
  storageKey: string,
): PersistedSession | null {
  const raw = storage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
}

export function writePersistedSession(
  storage: StorageAdapter,
  storageKey: string,
  session: PersistedSession,
): void {
  storage.setItem(storageKey, JSON.stringify(session));
}

export function clearPersistedSession(storage: StorageAdapter, storageKey: string): void {
  storage.removeItem(storageKey);
}
