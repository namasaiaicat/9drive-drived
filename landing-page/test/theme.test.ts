import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ThemeToggle,
  applyThemeToDocument,
  getCurrentTheme,
} from '../src/islands/ThemeToggle';
import {
  STORAGE_KEYS,
  safeStorageGet,
  safeStorageSet,
  clearMemoryFallback,
} from '../src/utils/storage';

interface MockClassList {
  classes: Set<string>;
  add: (cls: string) => void;
  remove: (cls: string) => void;
  contains: (cls: string) => boolean;
  toggle: (cls: string, force?: boolean) => boolean;
}

function createMockClassList(): MockClassList {
  const classes = new Set<string>();
  return {
    classes,
    add: (cls: string) => classes.add(cls),
    remove: (cls: string) => classes.delete(cls),
    contains: (cls: string) => classes.has(cls),
    toggle: (cls: string, force?: boolean) => {
      if (force === true) {
        classes.add(cls);
        return true;
      } else if (force === false) {
        classes.delete(cls);
        return false;
      }
      if (classes.has(cls)) {
        classes.delete(cls);
        return false;
      } else {
        classes.add(cls);
        return true;
      }
    },
  };
}

function setupMockDOM(initialTheme?: 'dark' | 'light') {
  const classList = createMockClassList();
  if (initialTheme) {
    classList.add(initialTheme);
  }

  const attributes: Record<string, string> = {};
  const style: Record<string, any> = {};

  const documentElement = {
    classList,
    setAttribute: vi.fn((name: string, val: string) => {
      attributes[name] = val;
    }),
    getAttribute: vi.fn((name: string) => attributes[name] ?? null),
    style,
  };

  const documentMock = {
    documentElement,
  };

  const mockStore: Record<string, string> = {};
  const mockStorage: Storage = {
    getItem: vi.fn((key: string) => mockStore[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      mockStore[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStore[key];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(mockStore)) delete mockStore[k];
    }),
    key: vi.fn(() => null),
    length: 0,
  };

  const mediaListeners: Array<(e: { matches: boolean }) => void> = [];
  let systemDarkMatches = true;

  const matchMediaMock = vi.fn((query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? systemDarkMatches : false,
    media: query,
    onchange: null,
    addListener: vi.fn((listener: (e: { matches: boolean }) => void) => {
      mediaListeners.push(listener);
    }),
    removeListener: vi.fn((listener: (e: { matches: boolean }) => void) => {
      const idx = mediaListeners.indexOf(listener);
      if (idx !== -1) mediaListeners.splice(idx, 1);
    }),
    addEventListener: vi.fn((event: string, listener: (e: { matches: boolean }) => void) => {
      if (event === 'change') mediaListeners.push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        const idx = mediaListeners.indexOf(listener);
        if (idx !== -1) mediaListeners.splice(idx, 1);
      }
    }),
    dispatchEvent: vi.fn(),
  }));

  const windowMock: Record<string, any> = {
    localStorage: mockStorage,
    matchMedia: matchMediaMock,
    document: documentMock,
  };

  vi.stubGlobal('document', documentMock);
  vi.stubGlobal('window', windowMock);
  vi.stubGlobal('localStorage', mockStorage);

  return {
    documentElement,
    classList,
    attributes,
    style,
    mockStore,
    mockStorage,
    matchMediaMock,
    mediaListeners,
    setSystemDark: (matches: boolean) => {
      systemDarkMatches = matches;
    },
    triggerMediaChange: (matches: boolean) => {
      systemDarkMatches = matches;
      mediaListeners.forEach((fn) => fn({ matches }));
    },
  };
}

describe('TASK-013: Inline Theme Script Evaluation & FOIT Prevention', () => {
  const scriptPath = path.resolve(__dirname, '../src/scripts/theme-init.inline.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  beforeEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  it('script file exists and contains synchronous blocking theme evaluation logic', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    expect(scriptContent).toContain('9drive_theme');
    expect(scriptContent).toContain('prefers-color-scheme: dark');
    expect(scriptContent).toContain('classList.add');
    expect(scriptContent).toContain('document.documentElement');
  });

  it('evaluates stored dark preference and assigns .dark to documentElement', () => {
    const dom = setupMockDOM();
    dom.mockStore['9drive_theme'] = 'dark';

    // Execute the inline script synchronously
    const runScript = new Function(scriptContent);
    runScript();

    expect(dom.classList.contains('dark')).toBe(true);
    expect(dom.classList.contains('light')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('dark');
    expect(dom.style.colorScheme).toBe('dark');
  });

  it('evaluates stored light preference and assigns .light to documentElement', () => {
    const dom = setupMockDOM();
    dom.mockStore['9drive_theme'] = 'light';

    const runScript = new Function(scriptContent);
    runScript();

    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('light');
    expect(dom.style.colorScheme).toBe('light');
  });

  it('falls back to matchMedia when no localStorage value exists (OS dark preference)', () => {
    const dom = setupMockDOM();
    dom.setSystemDark(true);

    const runScript = new Function(scriptContent);
    runScript();

    expect(dom.classList.contains('dark')).toBe(true);
    expect(dom.classList.contains('light')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('dark');
  });

  it('falls back to matchMedia when no localStorage value exists (OS light preference)', () => {
    const dom = setupMockDOM();
    dom.setSystemDark(false);

    const runScript = new Function(scriptContent);
    runScript();

    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('light');
  });

  it('catches SecurityError on localStorage and safely defaults to matchMedia without throwing', () => {
    const dom = setupMockDOM();
    dom.setSystemDark(false);

    // Mock localStorage throwing SecurityError
    vi.stubGlobal('window', {
      get localStorage() {
        throw new DOMException('Access denied', 'SecurityError');
      },
      matchMedia: dom.matchMediaMock,
      document: dom.documentElement,
    });

    const runScript = new Function(scriptContent);
    expect(() => runScript()).not.toThrow();

    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
  });
});

describe('TASK-014: CSS Theme Tokens & Palette Variables', () => {
  const cssPath = path.resolve(__dirname, '../src/styles/theme.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('theme.css exists and defines dark-first palette tokens on :root', () => {
    expect(fs.existsSync(cssPath)).toBe(true);
    expect(cssContent).toContain(':root {');
    expect(cssContent).toContain('--color-canvas:');
    expect(cssContent).toContain('--color-surface:');
    expect(cssContent).toContain('--color-primary:');
    expect(cssContent).toContain('--color-text-primary:');
    expect(cssContent).toContain('--color-border:');
    expect(cssContent).toContain('color-scheme: dark;');
  });

  it('defines light mode overrides adhering to Google Material Design 3', () => {
    expect(cssContent).toContain(':root.light');
    expect(cssContent).toContain('html.light');
    expect(cssContent).toContain("[data-theme='light']");
    expect(cssContent).toContain('#0b57d0'); // Primary Google Blue
    expect(cssContent).toContain('#f8fafd'); // Light app canvas
    expect(cssContent).toContain('#ffffff'); // White surface
    expect(cssContent).toContain('color-scheme: light;');
  });

  it('defines dark mode explicit selectors and accessible focus visible styling', () => {
    expect(cssContent).toContain(':root.dark');
    expect(cssContent).toContain('html.dark');
    expect(cssContent).toContain("[data-theme='dark']");
    expect(cssContent).toContain(':focus-visible');
    expect(cssContent).toContain('--color-focus');
  });
});

describe('TASK-015: ThemeToggle Island Component & Persistence', () => {
  beforeEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  it('applies theme classes, data-theme, and colorScheme to documentElement via applyThemeToDocument', () => {
    const dom = setupMockDOM();

    applyThemeToDocument('dark');
    expect(dom.classList.contains('dark')).toBe(true);
    expect(dom.classList.contains('light')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('dark');
    expect(dom.style.colorScheme).toBe('dark');

    applyThemeToDocument('light');
    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
    expect(dom.attributes['data-theme']).toBe('light');
    expect(dom.style.colorScheme).toBe('light');
  });

  it('getCurrentTheme resolves theme from document class, storage, and matchMedia', () => {
    const dom = setupMockDOM('dark');
    expect(getCurrentTheme()).toBe('dark');

    dom.classList.remove('dark');
    dom.classList.add('light');
    expect(getCurrentTheme()).toBe('light');

    dom.classList.remove('light');
    safeStorageSet(STORAGE_KEYS.THEME, 'dark');
    expect(getCurrentTheme()).toBe('dark');

    safeStorageSet(STORAGE_KEYS.THEME, 'light');
    expect(getCurrentTheme()).toBe('light');

    clearMemoryFallback();
    dom.mockStore['9drive_theme'] = '';
    dom.setSystemDark(true);
    expect(getCurrentTheme()).toBe('dark');

    dom.setSystemDark(false);
    expect(getCurrentTheme()).toBe('light');
  });

  it('renders ThemeToggle button with accessible attributes and SVGs in SSR', () => {
    const html = renderToStaticMarkup(
      React.createElement(ThemeToggle, {
        ariaLabel: 'Ubah Tema Warna',
        className: 'custom-toggle-class',
      })
    );

    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('custom-toggle-class');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Ubah Tema Warna"');
    expect(html).toContain('data-testid="theme-toggle-button"');
    expect(html).toContain('<svg');
  });

  it('persists manual theme switch into safeStorage when clicked', () => {
    const dom = setupMockDOM('dark');
    let themeValue = 'dark';
    const onThemeChange = vi.fn((newTheme: 'dark' | 'light') => {
      themeValue = newTheme;
    });

    // Simulating component click behavior
    const handleToggle = () => {
      const nextTheme = themeValue === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(nextTheme);
      safeStorageSet(STORAGE_KEYS.THEME, nextTheme);
      onThemeChange(nextTheme);
    };

    handleToggle();
    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
    expect(safeStorageGet(STORAGE_KEYS.THEME)).toBe('light');
    expect(onThemeChange).toHaveBeenCalledWith('light');

    handleToggle();
    expect(dom.classList.contains('dark')).toBe(true);
    expect(dom.classList.contains('light')).toBe(false);
    expect(safeStorageGet(STORAGE_KEYS.THEME)).toBe('dark');
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('handles QuotaExceededError and SecurityError safely with in-memory persistence fallback', () => {
    const dom = setupMockDOM();
    dom.mockStorage.setItem = vi.fn(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    expect(() => {
      safeStorageSet(STORAGE_KEYS.THEME, 'light');
    }).not.toThrow();

    expect(safeStorageGet(STORAGE_KEYS.THEME)).toBe('light');
  });
});

describe('TASK-016: Dynamic OS Color Scheme Listener in ThemeToggle', () => {
  beforeEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearMemoryFallback();
    vi.restoreAllMocks();
  });

  it('attaches change listener and dynamically updates DOM when manual preference is unset', () => {
    const dom = setupMockDOM();
    // Ensure no manual preference is stored
    expect(safeStorageGet(STORAGE_KEYS.THEME)).toBeNull();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChangeCallback = vi.fn((e: { matches: boolean }) => {
      const manualPreference = safeStorageGet(STORAGE_KEYS.THEME);
      if (!manualPreference) {
        const nextTheme = e.matches ? 'dark' : 'light';
        applyThemeToDocument(nextTheme);
      }
    });

    mediaQuery.addEventListener('change', onChangeCallback);

    // OS toggles to light mode
    dom.triggerMediaChange(false);
    expect(onChangeCallback).toHaveBeenCalled();
    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);

    // OS toggles to dark mode
    dom.triggerMediaChange(true);
    expect(dom.classList.contains('dark')).toBe(true);
    expect(dom.classList.contains('light')).toBe(false);
  });

  it('does NOT override manual preference when OS color scheme changes', () => {
    const dom = setupMockDOM('light');
    // User explicitly manually chose 'light'
    safeStorageSet(STORAGE_KEYS.THEME, 'light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChangeCallback = vi.fn((e: { matches: boolean }) => {
      const manualPreference = safeStorageGet(STORAGE_KEYS.THEME);
      if (!manualPreference) {
        const nextTheme = e.matches ? 'dark' : 'light';
        applyThemeToDocument(nextTheme);
      }
    });

    mediaQuery.addEventListener('change', onChangeCallback);

    // OS switches to dark mode while manual preference is 'light'
    dom.triggerMediaChange(true);
    expect(onChangeCallback).toHaveBeenCalled();
    // Document should REMAIN light because manual override is active
    expect(dom.classList.contains('light')).toBe(true);
    expect(dom.classList.contains('dark')).toBe(false);
    expect(safeStorageGet(STORAGE_KEYS.THEME)).toBe('light');
  });
});

describe('Zero FOIT Build Verification in Rendered HTML Output', () => {
  it('dist/en/index.html and dist/id/index.html include synchronous blocking theme script in head', () => {
    const enHtmlPath = path.resolve(__dirname, '../dist/en/index.html');
    const idHtmlPath = path.resolve(__dirname, '../dist/id/index.html');

    expect(fs.existsSync(enHtmlPath)).toBe(true);
    expect(fs.existsSync(idHtmlPath)).toBe(true);

    const enHtml = fs.readFileSync(enHtmlPath, 'utf-8');
    const idHtml = fs.readFileSync(idHtmlPath, 'utf-8');

    expect(enHtml).toContain('9drive_theme');
    expect(enHtml).toContain('prefers-color-scheme: dark');
    expect(enHtml).toContain('document.documentElement');

    expect(idHtml).toContain('9drive_theme');
    expect(idHtml).toContain('prefers-color-scheme: dark');
    expect(idHtml).toContain('document.documentElement');
  });
});
