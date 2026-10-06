import React, { useState, useEffect, useCallback } from 'react';
import type { Locale } from '../types';
import { syncRouteLocale } from '../utils/locale-router';

export interface LanguageSelectorProps {
  /** The currently active locale */
  readonly currentLocale: Locale;
  /** Accessible label for the selector group */
  readonly ariaLabel?: string;
  /** Optional custom CSS class */
  readonly className?: string;
  /** Optional change callback for testing and integrations */
  readonly onLocaleChange?: (locale: Locale, targetUrl: string) => void;
}

/**
 * Pure helper to compute target URL when switching locales while preserving
 * current path suffix, URL query parameters, and hash anchors.
 *
 * Example:
 * /en#install -> /id#install
 * /id?search=test#faq -> /en?search=test#faq
 */
export function resolveLocaleSwitchUrl(
  targetLocale: Locale,
  currentPathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
  currentSearch: string = typeof window !== 'undefined' ? window.location.search : '',
  currentHash: string = typeof window !== 'undefined' ? window.location.hash : ''
): string {
  const safePath = currentPathname || '';
  // Replace leading /en or /id with /${targetLocale}, or prepend /${targetLocale}
  let newPathname = safePath.replace(/^\/(en|id)(\/|$)/, `/${targetLocale}$2`);
  if (!newPathname.startsWith(`/${targetLocale}`)) {
    if (newPathname === '' || newPathname === '/') {
      newPathname = `/${targetLocale}`;
    } else if (newPathname.startsWith('/')) {
      newPathname = `/${targetLocale}${newPathname}`;
    } else {
      newPathname = `/${targetLocale}/${newPathname}`;
    }
  }

  if (newPathname === `/${targetLocale}/`) {
    newPathname = `/${targetLocale}`;
  }

  const cleanSearch = currentSearch && !currentSearch.startsWith('?') ? `?${currentSearch}` : currentSearch;
  const cleanHash = currentHash && !currentHash.startsWith('#') ? `#${currentHash}` : currentHash;

  return `${newPathname}${cleanSearch}${cleanHash}`;
}

/**
 * Handles switching language: persists to storage and performs navigation.
 */
export function switchLocale(
  targetLocale: Locale,
  navigate: boolean = true,
  currentPath?: string,
  currentSearch?: string,
  currentHash?: string
): string {
  const targetUrl = resolveLocaleSwitchUrl(
    targetLocale,
    currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    currentSearch ?? (typeof window !== 'undefined' ? window.location.search : ''),
    currentHash ?? (typeof window !== 'undefined' ? window.location.hash : '')
  );

  syncRouteLocale(targetLocale);

  if (navigate && typeof window !== 'undefined' && window.location) {
    window.location.href = targetUrl;
  }

  return targetUrl;
}

const AVAILABLE_LOCALES: readonly { readonly code: Locale; readonly label: string; readonly title: string }[] = [
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'id', label: 'ID', title: 'Bahasa Indonesia' },
];

/**
 * LanguageSelector Island:
 * Provides accessible language toggle between English and Indonesian.
 * Preserves current URL query parameters and anchor hashes across navigation.
 * Synchronizes selection with localStorage (resilient to private browsing).
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLocale,
  ariaLabel = 'Switch language',
  className = '',
  onLocaleChange,
}) => {
  const [urlParams, setUrlParams] = useState<{ path: string; search: string; hash: string }>(() => ({
    path: typeof window !== 'undefined' ? window.location.pathname : `/${currentLocale}`,
    search: typeof window !== 'undefined' ? window.location.search : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  }));

  // Sync client URL parameters upon mounting and on hashchange/popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateFromLocation = () => {
      setUrlParams({
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    updateFromLocation();
    window.addEventListener('hashchange', updateFromLocation);
    window.addEventListener('popstate', updateFromLocation);

    return () => {
      window.removeEventListener('hashchange', updateFromLocation);
      window.removeEventListener('popstate', updateFromLocation);
    };
  }, []);

  const handleLocaleClick = useCallback(
    (targetLocale: Locale, event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (targetLocale === currentLocale) return;

      const nextUrl = switchLocale(
        targetLocale,
        true,
        urlParams.path,
        urlParams.search,
        urlParams.hash
      );

      onLocaleChange?.(targetLocale, nextUrl);
    },
    [currentLocale, urlParams, onLocaleChange]
  );

  return (
    <nav
      className={`lang-selector-group ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="lang-selector-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>
      {AVAILABLE_LOCALES.map(({ code, label, title }) => {
        const isActive = code === currentLocale;
        const targetUrl = resolveLocaleSwitchUrl(code, urlParams.path, urlParams.search, urlParams.hash);

        return (
          <a
            key={code}
            href={targetUrl}
            onClick={(e) => handleLocaleClick(code, e)}
            className={`lang-selector-btn ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            aria-label={title}
            title={title}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
};
