/**
 * In-memory fallback map for storage resilience when localStorage is disabled,
 * blocked by SecurityError (private browsing/third-party contexts), or throws quota exceptions.
 */
const memoryFallback = new Map<string, string>();

/**
 * Common storage keys used across 9Drive landing page
 */
export const STORAGE_KEYS = {
  LOCALE: '9drive_locale',
  THEME: '9drive_theme',
  PLATFORM_PREF: '9drive_platform_pref',
} as const;

export const LOCALE_STORAGE_KEY = STORAGE_KEYS.LOCALE;
export const PLATFORM_STORAGE_KEY = STORAGE_KEYS.PLATFORM_PREF;

/**
 * Safely access window.localStorage without throwing SecurityError.
 */
function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Accessing window.localStorage threw SecurityError or is restricted
  }
  return null;
}

/**
 * Resilient getter for storage values.
 * Catches SecurityError, QuotaExceededError, or private browsing exceptions with in-memory fallback.
 *
 * @param key The key to retrieve
 * @param fallback Optional fallback value if the key does not exist
 * @returns The retrieved value or fallback
 */
export function safeStorageGet(key: string, fallback: string | null = null): string | null {
  const storage = getLocalStorage();
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Storage access threw (e.g. SecurityError in iframe or private browsing)
    }
  }

  // Fall back to in-memory map or provided fallback
  return memoryFallback.has(key) ? (memoryFallback.get(key) ?? null) : fallback;
}

/**
 * Resilient setter for storage values.
 * Writes to in-memory store and attempts to synchronize to localStorage.
 * Catches SecurityError, QuotaExceededError, or private browsing exceptions without crashing.
 *
 * @param key The key to set
 * @param value The value to store
 * @returns true if written to localStorage without error, false if persisted only in memory fallback
 */
export function safeStorageSet(key: string, value: string): boolean {
  memoryFallback.set(key, value);
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      // SecurityError, QuotaExceededError, etc. Handled via memory fallback.
      return false;
    }
  }
  return false;
}

/**
 * Resilient removal of a storage key from both localStorage and in-memory store.
 *
 * @param key The key to remove
 * @returns true if removed from localStorage without error
 */
export function safeStorageRemove(key: string): boolean {
  memoryFallback.delete(key);
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Safely access window.sessionStorage without throwing SecurityError.
 */
function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Accessing window.sessionStorage threw SecurityError or is restricted
  }
  return null;
}

/**
 * Resilient getter for sessionStorage values.
 * Catches SecurityError, QuotaExceededError, or private browsing exceptions with in-memory fallback.
 */
export function safeSessionStorageGet(key: string, fallback: string | null = null): string | null {
  const storage = getSessionStorage();
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Storage access threw
    }
  }

  return memoryFallback.has(key) ? (memoryFallback.get(key) ?? null) : fallback;
}

/**
 * Resilient setter for sessionStorage values.
 * Writes to in-memory store and attempts to synchronize to sessionStorage.
 */
export function safeSessionStorageSet(key: string, value: string): boolean {
  memoryFallback.set(key, value);
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resilient removal of a storage key from sessionStorage and in-memory store.
 */
export function safeSessionStorageRemove(key: string): boolean {
  memoryFallback.delete(key);
  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Clears the in-memory fallback store (primarily for unit tests).
 */
export function clearMemoryFallback(): void {
  memoryFallback.clear();
}

