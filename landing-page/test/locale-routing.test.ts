import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  clearMemoryFallback,
  LOCALE_STORAGE_KEY,
} from '../src/utils/storage';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isValidLocale,
  resolveBrowserLocale,
  resolveTargetLocale,
  buildRedirectUrl,
  resolveRootRedirectPath,
  performRootRedirect,
  syncRouteLocale,
} from '../src/utils/locale-router';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Resilient Storage Accessors (TASK-008)', () => {
  beforeEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  it('safely gets and sets values when window.localStorage is healthy', () => {
    const mockStore: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(mockStore)) delete mockStore[k];
      }),
      key: vi.fn((index: number) => Object.keys(mockStore)[index] ?? null),
      length: 0,
    };

    vi.stubGlobal('window', { localStorage: mockStorage });

    const setResult = safeStorageSet('test_key', 'test_value');
    expect(setResult).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith('test_key', 'test_value');

    const value = safeStorageGet('test_key');
    expect(value).toBe('test_value');

    const removeResult = safeStorageRemove('test_key');
    expect(removeResult).toBe(true);
    expect(safeStorageGet('test_key')).toBeNull();
  });

  it('catches SecurityError on localStorage access and falls back to in-memory store', () => {
    // Simulate private browsing or cross-origin iframe where accessing window.localStorage throws SecurityError
    vi.stubGlobal('window', {
      get localStorage() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });

    // Should not throw, but safely store in memory fallback
    expect(() => safeStorageSet(LOCALE_STORAGE_KEY, 'id')).not.toThrow();
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('id');

    // Returns fallback when key not present
    expect(safeStorageGet('non_existent', 'fallback_val')).toBe('fallback_val');
  });

  it('catches QuotaExceededError when setting localStorage and preserves value in in-memory fallback', () => {
    const mockStorage: Storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };

    vi.stubGlobal('window', { localStorage: mockStorage });

    // Writing should not crash; safeStorageSet returns false indicating localStorage write failure
    const success = safeStorageSet(LOCALE_STORAGE_KEY, 'id');
    expect(success).toBe(false);

    // Value is still available via in-memory fallback
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('id');
  });

  it('works in Node/SSR environment where window is undefined', () => {
    vi.stubGlobal('window', undefined);

    expect(() => safeStorageSet('ssr_key', 'ssr_value')).not.toThrow();
    expect(safeStorageGet('ssr_key')).toBe('ssr_value');
    expect(safeStorageGet('missing_key', 'default')).toBe('default');
  });
});

describe('Locale Fallback Negotiation & Redirection Logic (TASK-009, TASK-010)', () => {
  it('validates supported locales properly', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'id']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('id')).toBe(true);
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale(null)).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
  });

  it('resolves browser language with id* mapping to id, and all others to en', () => {
    expect(resolveBrowserLocale('id')).toBe('id');
    expect(resolveBrowserLocale('id-ID')).toBe('id');
    expect(resolveBrowserLocale('id-Latn-ID')).toBe('id');
    expect(resolveBrowserLocale('ID')).toBe('id');
    expect(resolveBrowserLocale('en-US')).toBe('en');
    expect(resolveBrowserLocale('en-GB')).toBe('en');
    expect(resolveBrowserLocale('fr-FR')).toBe('en');
    expect(resolveBrowserLocale('ja')).toBe('en');
    expect(resolveBrowserLocale('')).toBe('en');
    expect(resolveBrowserLocale(null)).toBe('en');
    expect(resolveBrowserLocale(undefined)).toBe('en');
  });

  it('gives localStorage preference priority over browser language at root', () => {
    // Stored id wins even if browser is en-US
    expect(resolveTargetLocale('id', 'en-US')).toBe('id');
    // Stored en wins even if browser is id-ID
    expect(resolveTargetLocale('en', 'id-ID')).toBe('en');
    // Invalid stored locale falls back to browser language
    expect(resolveTargetLocale('invalid', 'id-ID')).toBe('id');
    expect(resolveTargetLocale('invalid', 'en-US')).toBe('en');
    // Null stored locale falls back to browser language
    expect(resolveTargetLocale(null, 'id-ID')).toBe('id');
    expect(resolveTargetLocale(null, 'de-DE')).toBe('en');
    expect(resolveTargetLocale(null, null)).toBe('en');
  });

  it('builds redirection URL preserving query strings and anchor hashes', () => {
    expect(buildRedirectUrl('en')).toBe('/en');
    expect(buildRedirectUrl('id')).toBe('/id');
    expect(buildRedirectUrl('en', '?ref=producthunt', '#setup')).toBe('/en?ref=producthunt#setup');
    expect(buildRedirectUrl('id', 'sort=desc', 'faq')).toBe('/id?sort=desc#faq');
    expect(buildRedirectUrl('en', '', '#features')).toBe('/en#features');
    expect(buildRedirectUrl('id', '?dark=true', '')).toBe('/id?dark=true');
  });

  it('resolves root redirect path with full context', () => {
    const path1 = resolveRootRedirectPath({
      storedLocale: 'id',
      browserLanguage: 'en-US',
      search: '?campaign=launch',
      hash: '#install',
    });
    expect(path1).toBe('/id?campaign=launch#install');

    const path2 = resolveRootRedirectPath({
      storedLocale: null,
      browserLanguage: 'id-ID',
      search: '',
      hash: '',
    });
    expect(path2).toBe('/id');
  });

  it('explicit deep-link route visit overrides preexisting localStorage value', () => {
    const mockStore: Record<string, string> = { [LOCALE_STORAGE_KEY]: 'id' };
    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };
    vi.stubGlobal('window', { localStorage: mockStorage });

    // Initially stored as 'id'
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('id');

    // Visiting /en synchronizes route locale
    syncRouteLocale('en');
    expect(mockStorage.setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'en');
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('en');

    // Visiting /id synchronizes route locale back to 'id'
    syncRouteLocale('id');
    expect(mockStorage.setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'id');
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('id');
  });

  it('performRootRedirect uses location.replace and suppresses storage exceptions', () => {
    const replaceMock = vi.fn();
    vi.stubGlobal('window', {
      location: {
        replace: replaceMock,
        search: '?ref=unit-test',
        hash: '#top',
      },
      get localStorage() {
        throw new DOMException('Security restriction', 'SecurityError');
      },
    });
    vi.stubGlobal('navigator', {
      language: 'id-ID',
    });

    expect(() => performRootRedirect()).not.toThrow();
    expect(replaceMock).toHaveBeenCalledWith('/id?ref=unit-test#top');
  });
});

describe('Static HTML Entrypoints & Inline Redirect Validation (TASK-009, TASK-010)', () => {
  it('public/index.html exists and contains synchronous redirect and noscript fallback', () => {
    const htmlPath = path.resolve(__dirname, '../public/index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const content = fs.readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('location.replace');
    expect(content).toContain('9drive_locale');
    expect(content).toContain('navigator.language');
    expect(content).toContain('noscript');
    expect(content).toContain('http-equiv="refresh"');
  });

  it('src/pages/index.astro contains synchronous redirect preserving query and hash', () => {
    const astroPath = path.resolve(__dirname, '../src/pages/index.astro');
    expect(fs.existsSync(astroPath)).toBe(true);

    const content = fs.readFileSync(astroPath, 'utf-8');
    expect(content).toContain('location.replace');
    expect(content).toContain('9drive_locale');
    expect(content).toContain('navigator.language');
    expect(content).toContain('location.search');
    expect(content).toContain('location.hash');
    expect(content).toContain('noscript');
  });

  it('src/pages/en/index.astro and src/pages/id/index.astro synchronize locale on entry', () => {
    const enPath = path.resolve(__dirname, '../src/pages/en/index.astro');
    const idPath = path.resolve(__dirname, '../src/pages/id/index.astro');

    const enContent = fs.readFileSync(enPath, 'utf-8');
    const idContent = fs.readFileSync(idPath, 'utf-8');

    expect(enContent).toContain("localStorage.setItem('9drive_locale', 'en')");
    expect(idContent).toContain("localStorage.setItem('9drive_locale', 'id')");
  });
});
