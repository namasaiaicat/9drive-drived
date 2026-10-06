import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../src/components/Hero';
import { Navbar } from '../src/components/Navbar';
import { Footer } from '../src/components/Footer';
import {
  LanguageSelector,
  resolveLocaleSwitchUrl,
  switchLocale,
} from '../src/islands/LanguageSelector';
import {
  MobileDrawer,
  lockBodyScroll,
  handleFocusTrapKeyDown,
  getFocusableElements,
} from '../src/islands/MobileDrawer';
import { dictionary as enDictionary } from '../src/data/locales/en';
import { dictionary as idDictionary } from '../src/data/locales/id';
import {
  safeStorageGet,
  safeStorageSet,
  clearMemoryFallback,
  LOCALE_STORAGE_KEY,
} from '../src/utils/storage';

describe('Hero Component (TASK-019)', () => {
  it('renders value proposition, tagline badge, and CTA anchors with secure attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(Hero, {
        hero: enDictionary.hero,
        githubUrl: 'https://github.com/ninedrive/9drive',
      })
    );

    // Section and container
    expect(html).toContain('id="hero"');
    expect(html).toContain('class="hero-section"');

    // Badge
    expect(html).toContain(enDictionary.hero.badge);

    // Title and highlight
    expect(html).toContain(enDictionary.hero.title);
    expect(html).toContain(enDictionary.hero.highlight);

    // Subtitle
    expect(html).toContain(enDictionary.hero.subtitle);

    // Install CTA jumping to #install
    expect(html).toMatch(/<a[^>]*href="#install"[^>]*class="[^"]*hero-btn-primary[^"]*"/);
    expect(html).toContain(enDictionary.hero.installCta);

    // GitHub external CTA with secure attributes
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/ninedrive\/9drive"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain(enDictionary.hero.githubCta);
  });

  it('renders localized Indonesian hero content accurately', () => {
    const html = renderToStaticMarkup(
      React.createElement(Hero, {
        hero: idDictionary.hero,
      })
    );

    expect(html).toContain(idDictionary.hero.badge);
    expect(html).toContain(idDictionary.hero.title);
    expect(html).toContain(idDictionary.hero.highlight);
    expect(html).toContain(idDictionary.hero.subtitle);
    expect(html).toContain(idDictionary.hero.installCta);
    expect(html).toContain(idDictionary.hero.githubCta);
  });
});

describe('LanguageSelector Island & Route/Hash Preservation (TASK-020)', () => {
  beforeEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  it('resolveLocaleSwitchUrl preserves hash anchors across locale transitions', () => {
    // /en#install -> /id#install
    expect(resolveLocaleSwitchUrl('id', '/en', '', '#install')).toBe('/id#install');
    // /id#faq -> /en#faq
    expect(resolveLocaleSwitchUrl('en', '/id', '', '#faq')).toBe('/en#faq');
  });

  it('resolveLocaleSwitchUrl preserves URL search params and hash anchors', () => {
    // /en?ref=twitter#install -> /id?ref=twitter#install
    expect(
      resolveLocaleSwitchUrl('id', '/en', '?ref=twitter', '#install')
    ).toBe('/id?ref=twitter#install');

    // Without leading ? or #
    expect(
      resolveLocaleSwitchUrl('id', '/en', 'ref=twitter', 'install')
    ).toBe('/id?ref=twitter#install');
  });

  it('resolveLocaleSwitchUrl handles nested subpaths and root paths', () => {
    // /en/docs/quickstart#step-1 -> /id/docs/quickstart#step-1
    expect(
      resolveLocaleSwitchUrl('id', '/en/docs/quickstart', '', '#step-1')
    ).toBe('/id/docs/quickstart#step-1');

    // Root path / -> /id
    expect(resolveLocaleSwitchUrl('id', '/', '', '')).toBe('/id');
    // Empty path -> /en
    expect(resolveLocaleSwitchUrl('en', '', '', '')).toBe('/en');
  });

  it('switchLocale updates storage and returns target URL', () => {
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {},
        key: () => null,
        length: 0,
      },
      location: {
        pathname: '/en',
        search: '?filter=latest',
        hash: '#install',
        href: '',
      },
    });

    const targetUrl = switchLocale('id', true);
    expect(targetUrl).toBe('/id?filter=latest#install');
    expect(safeStorageGet(LOCALE_STORAGE_KEY)).toBe('id');
    expect(window.location.href).toBe('/id?filter=latest#install');
  });

  it('renders accessible LanguageSelector markup with ARIA roles and active state', () => {
    const html = renderToStaticMarkup(
      React.createElement(LanguageSelector, {
        currentLocale: 'en',
        ariaLabel: 'Switch language',
      })
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Switch language"');
    // English is active
    expect(html).toMatch(/class="[^"]*lang-selector-btn[^"]*active[^"]*"[^>]*aria-current="true"/);
    expect(html).toContain('>EN<');
    expect(html).toContain('>ID<');
  });
});

describe('MobileDrawer Island & Accessibility Interactions (TASK-021)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders closed hamburger button with aria-expanded="false" and aria-controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, {
        nav: enDictionary.nav,
        currentLocale: 'en',
        isOpen: false,
      })
    );

    expect(html).toContain('class="navbar-hamburger"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="mobile-nav-drawer"');
    expect(html).toContain(`aria-label="${enDictionary.nav.menuOpenAria}"`);
    expect(html).not.toContain('class="drawer-panel"');
  });

  it('renders open state with dialog semantics, backdrop, and close button', () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, {
        nav: enDictionary.nav,
        currentLocale: 'en',
        isOpen: true,
      })
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`aria-label="${enDictionary.nav.menuCloseAria}"`);
    expect(html).toContain('class="drawer-backdrop"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('class="drawer-close-btn"');

    // Contains all navigation anchor links
    expect(html).toContain('href="#showcase"');
    expect(html).toContain('href="#features"');
    expect(html).toContain('href="#install"');
    expect(html).toContain('href="#faq"');
  });

  it('lockBodyScroll sets overflow: hidden and restores previous value upon unlock', () => {
    const bodyMock = {
      style: {
        overflow: 'auto',
      },
    };
    vi.stubGlobal('document', { body: bodyMock });

    const unlock = lockBodyScroll();
    expect(bodyMock.style.overflow).toBe('hidden');

    unlock();
    expect(bodyMock.style.overflow).toBe('auto');
  });

  it('handleFocusTrapKeyDown wraps Tab from last to first focusable element', () => {
    const btn1 = { focus: vi.fn(), hasAttribute: () => false, getAttribute: () => null };
    const btn2 = { focus: vi.fn(), hasAttribute: () => false, getAttribute: () => null };
    const focusables = [btn1, btn2];

    const containerMock = {
      querySelectorAll: vi.fn().mockReturnValue(focusables),
      contains: vi.fn().mockReturnValue(true),
    } as unknown as HTMLElement;

    // Simulate active element being btn2 (last element)
    vi.stubGlobal('document', { activeElement: btn2 });

    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handleFocusTrapKeyDown(containerMock, event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(btn1.focus).toHaveBeenCalled();
  });

  it('handleFocusTrapKeyDown wraps Shift+Tab from first to last focusable element', () => {
    const btn1 = { focus: vi.fn(), hasAttribute: () => false, getAttribute: () => null };
    const btn2 = { focus: vi.fn(), hasAttribute: () => false, getAttribute: () => null };
    const focusables = [btn1, btn2];

    const containerMock = {
      querySelectorAll: vi.fn().mockReturnValue(focusables),
      contains: vi.fn().mockReturnValue(true),
    } as unknown as HTMLElement;

    // Simulate active element being btn1 (first element)
    vi.stubGlobal('document', { activeElement: btn1 });

    const event = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handleFocusTrapKeyDown(containerMock, event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(btn2.focus).toHaveBeenCalled();
  });

  it('getFocusableElements filters out disabled and tabindex="-1" elements', () => {
    const validBtn = {
      hasAttribute: (attr: string) => attr === 'disabled' ? false : false,
      getAttribute: (attr: string) => attr === 'tabindex' ? '0' : null,
    };
    const disabledBtn = {
      hasAttribute: (attr: string) => attr === 'disabled' ? true : false,
      getAttribute: (attr: string) => null,
    };
    const negativeTabIndex = {
      hasAttribute: () => false,
      getAttribute: (attr: string) => attr === 'tabindex' ? '-1' : null,
    };

    const containerMock = {
      querySelectorAll: vi.fn().mockReturnValue([validBtn, disabledBtn, negativeTabIndex]),
    } as unknown as HTMLElement;

    const result = getFocusableElements(containerMock);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(validBtn);
  });
});

describe('Navbar Component (TASK-022)', () => {
  it('renders sticky header, brand link, desktop anchors, and embedded islands', () => {
    const html = renderToStaticMarkup(
      React.createElement(Navbar, {
        nav: enDictionary.nav,
        currentLocale: 'en',
      })
    );

    // Header element
    expect(html).toContain('id="site-header"');
    expect(html).toContain('class="sticky-navbar"');

    // Brand link
    expect(html).toContain('href="/en"');
    expect(html).toContain('class="navbar-brand"');

    // Desktop nav anchors
    expect(html).toContain('href="#showcase"');
    expect(html).toContain(enDictionary.nav.showcase);
    expect(html).toContain('href="#features"');
    expect(html).toContain(enDictionary.nav.features);
    expect(html).toContain('href="#install"');
    expect(html).toContain(enDictionary.nav.install);
    expect(html).toContain('href="#faq"');
    expect(html).toContain(enDictionary.nav.faq);

    // External GitHub link
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/ninedrive\/9drive"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain(enDictionary.nav.github);

    // Embedded LanguageSelector & ThemeToggle
    expect(html).toContain('class="lang-selector-group');
    expect(html).toContain('class="theme-toggle');

    // Mobile trigger button
    expect(html).toContain('class="navbar-hamburger"');
  });

  it('renders localized Indonesian navbar labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(Navbar, {
        nav: idDictionary.nav,
        currentLocale: 'id',
      })
    );

    expect(html).toContain('href="/id"');
    expect(html).toContain(idDictionary.nav.showcase);
    expect(html).toContain(idDictionary.nav.features);
    expect(html).toContain(idDictionary.nav.install);
    expect(html).toContain(idDictionary.nav.faq);
    expect(html).toContain(idDictionary.nav.github);
  });
});

describe('Footer Component (TASK-023)', () => {
  it('displays copyright, license attribution, and community outbound links', () => {
    const html = renderToStaticMarkup(
      React.createElement(Footer, {
        footer: enDictionary.footer,
      })
    );

    expect(html).toContain('class="site-footer"');
    expect(html).toContain('role="contentinfo"');

    // Attribution
    expect(html).toContain(enDictionary.footer.copyright);
    expect(html).toContain(enDictionary.footer.license);

    // Outbound links with target="_blank" rel="noopener noreferrer"
    expect(html).toContain(`href="${enDictionary.footer.docsLink}"`);
    expect(html).toContain(`href="${enDictionary.footer.issuesLink}"`);
    expect(html).toContain(`href="${enDictionary.footer.communityLink}"`);

    expect(html).toMatch(/<a[^>]*href="https:\/\/docs\.9drive\.dev"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/ninedrive\/9drive\/issues"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/ninedrive\/9drive\/discussions"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  });

  it('renders localized Indonesian footer strings', () => {
    const html = renderToStaticMarkup(
      React.createElement(Footer, {
        footer: idDictionary.footer,
      })
    );

    expect(html).toContain(idDictionary.footer.copyright);
    expect(html).toContain(idDictionary.footer.license);
  });
});

describe('Sticky Navbar Offset CSS Compensation (TASK-022 / MDN scroll-margin)', () => {
  it('navigation.css includes 5rem scroll-margin-top offset rule', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/navigation.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('scroll-margin-top: 5rem');
    expect(cssContent).toContain(':target');
    expect(cssContent).toContain('position: sticky');
    expect(cssContent).toContain('.sticky-navbar');
  });
});
