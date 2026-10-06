import React from 'react';
import type { Dictionary, Locale } from '../types';
import { LanguageSelector } from '../islands/LanguageSelector';
import { ThemeToggle } from '../islands/ThemeToggle';
import { MobileDrawer } from '../islands/MobileDrawer';

export interface NavbarProps {
  /** Navigation dictionary strings */
  readonly nav: Dictionary['nav'];
  /** Active locale */
  readonly currentLocale: Locale;
  /** GitHub repository link */
  readonly githubUrl?: string;
}

export const DEFAULT_GITHUB_URL = 'https://github.com/ninedrive/9drive';

/**
 * Sticky Navbar Component adhering to Google Material Design 3.
 * Integrates:
 * - Brand logo & title linking to home root.
 * - Desktop navigation links (#showcase, #features, #install, #faq, external GitHub).
 * - LanguageSelector & ThemeToggle islands.
 * - Mobile hamburger trigger opening the accessible MobileDrawer.
 */
export const Navbar: React.FC<NavbarProps> = ({
  nav,
  currentLocale,
  githubUrl = DEFAULT_GITHUB_URL,
}) => {
  return (
    <header className="sticky-navbar" id="site-header">
      <div className="navbar-container">
        {/* Brand Logo & Name */}
        <div className="navbar-brand-wrapper">
          <a
            href={`/${currentLocale}`}
            className="navbar-brand"
            aria-label="9Drive - Return to homepage"
          >
            <span className="navbar-logo" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,20 2,20" fill="var(--color-primary, #0b57d0)" />
              </svg>
            </span>
            <span className="navbar-title">9Drive</span>
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="navbar-desktop-nav" aria-label="Desktop Navigation">
          <ul className="navbar-nav-list">
            <li>
              <a href="#showcase" className="navbar-nav-link">
                {nav.showcase}
              </a>
            </li>
            <li>
              <a href="#features" className="navbar-nav-link">
                {nav.features}
              </a>
            </li>
            <li>
              <a href="#install" className="navbar-nav-link">
                {nav.install}
              </a>
            </li>
            <li>
              <a href="#faq" className="navbar-nav-link">
                {nav.faq}
              </a>
            </li>
            <li>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-nav-link external"
              >
                <span>{nav.github}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </li>
          </ul>
        </nav>

        {/* Desktop Actions: LanguageSelector & ThemeToggle */}
        <div className="navbar-actions">
          <LanguageSelector
            currentLocale={currentLocale}
            ariaLabel={nav.languageToggleAria}
          />
          <ThemeToggle ariaLabel={nav.themeToggleAria} />
        </div>

        {/* Mobile Hamburger Trigger & Drawer */}
        <div className="navbar-mobile-container">
          <MobileDrawer
            nav={nav}
            currentLocale={currentLocale}
            githubUrl={githubUrl}
          />
        </div>
      </div>
    </header>
  );
};
