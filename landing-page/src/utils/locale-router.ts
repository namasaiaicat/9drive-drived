import type { Locale } from '../types';
import { safeStorageGet, safeStorageSet, LOCALE_STORAGE_KEY } from './storage';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'id'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export { LOCALE_STORAGE_KEY };

/**
 * Checks if a string is a valid supported locale.
 */
export function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === 'string' && (locale === 'en' || locale === 'id');
}

/**
 * Resolves a browser language string (e.g. from navigator.language) to a supported Locale.
 * Maps 'id*' (e.g. 'id', 'id-ID', 'id_ID') to 'id', and all others to 'en'.
 */
export function resolveBrowserLocale(browserLanguage?: string | null): Locale {
  if (!browserLanguage) {
    return DEFAULT_LOCALE;
  }
  const cleanLang = browserLanguage.trim().toLowerCase();
  if (cleanLang.startsWith('id')) {
    return 'id';
  }
  return 'en';
}

/**
 * Negotiates the target locale for root route redirection.
 * Evaluates stored preference first, then falls back to browser language, and finally default 'en'.
 *
 * @param storedLocale The locale retrieved from storage (if any)
 * @param browserLanguage The browser language string (e.g. navigator.language)
 */
export function resolveTargetLocale(
  storedLocale?: string | null,
  browserLanguage?: string | null
): Locale {
  if (isValidLocale(storedLocale)) {
    return storedLocale;
  }
  return resolveBrowserLocale(browserLanguage);
}

/**
 * Builds a redirection path preserving search parameters and URL anchor hashes.
 */
export function buildRedirectUrl(locale: Locale, search = '', hash = ''): string {
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search;
  const normalizedHash = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `/${locale}${normalizedSearch}${normalizedHash}`;
}

/**
 * Resolves the full redirect path from root based on storage, browser language, and current URL params.
 */
export function resolveRootRedirectPath(options?: {
  storedLocale?: string | null;
  browserLanguage?: string | null;
  search?: string;
  hash?: string;
}): string {
  const targetLocale = resolveTargetLocale(
    options?.storedLocale,
    options?.browserLanguage
  );
  return buildRedirectUrl(targetLocale, options?.search, options?.hash);
}

/**
 * Executes synchronous client-side redirection from the root path ('/') to the determined locale path.
 * Uses location.replace to avoid adding extraneous history entries and preserves query strings and hashes.
 */
export function performRootRedirect(): void {
  try {
    let storedLocale: string | null = null;
    try {
      storedLocale = safeStorageGet(LOCALE_STORAGE_KEY);
    } catch {
      // Storage access blocked or threw
    }

    const browserLang = typeof navigator !== 'undefined' ? navigator.language : null;
    const search = typeof window !== 'undefined' && window.location ? window.location.search : '';
    const hash = typeof window !== 'undefined' && window.location ? window.location.hash : '';

    const targetPath = resolveRootRedirectPath({
      storedLocale,
      browserLanguage: browserLang,
      search,
      hash,
    });

    if (typeof window !== 'undefined' && window.location) {
      window.location.replace(targetPath);
    }
  } catch {
    if (typeof window !== 'undefined' && window.location) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      window.location.replace(`/en${search}${hash}`);
    }
  }
}

/**
 * Synchronizes client storage to the current active route locale.
 * Explicit visits to /en or /id override preexisting storage values.
 *
 * @param locale The active route locale to persist
 */
export function syncRouteLocale(locale: Locale): boolean {
  if (!isValidLocale(locale)) {
    return false;
  }
  return safeStorageSet(LOCALE_STORAGE_KEY, locale);
}
