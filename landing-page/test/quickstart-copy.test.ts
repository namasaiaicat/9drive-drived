import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  QuickstartSnippets,
  copyToClipboard,
  resolveInitialPlatform,
  COPY_RESET_TIMEOUT_MS,
} from '../src/islands/QuickstartSnippets';
import {
  safeSessionStorageGet,
  safeSessionStorageSet,
  safeSessionStorageRemove,
  clearMemoryFallback,
  PLATFORM_STORAGE_KEY,
} from '../src/utils/storage';
import { dictionary as enDictionary } from '../src/data/locales/en';
import { dictionary as idDictionary } from '../src/data/locales/id';
import type { PlatformConfig } from '../src/types';

describe('CLI Quickstart Island Rendering & Accessibility (TASK-035)', () => {
  const quickstartData = enDictionary.quickstart;

  it('renders quickstart container, title, subtitle, and ordered setup steps', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickstartSnippets, {
        quickstart: quickstartData,
        initialPlatform: 'macos',
      })
    );

    expect(html).toContain('id="install"');
    expect(html).toContain('class="quickstart-section"');
    expect(html).toContain(quickstartData.sectionTitle);
    expect(html).toContain(quickstartData.sectionSubtitle);

    // Setup steps
    expect(html).toContain('class="quickstart-steps"');
    quickstartData.setupSteps.forEach((step: string, index: number) => {
      expect(html).toContain(step);
      expect(html).toContain(`class="quickstart-step-number">${index + 1}</span>`);
    });
  });

  it('renders WAI-ARIA tablist and tab controls with correct semantics', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickstartSnippets, {
        quickstart: quickstartData,
        initialPlatform: 'macos',
      })
    );

    expect(html).toContain('role="tablist"');

    // All platforms rendered as tabs
    quickstartData.platforms.forEach((platform: PlatformConfig) => {
      const tabId = `quickstart-tab-${platform.id}`;
      const panelId = `quickstart-panel-${platform.id}`;

      expect(html).toContain(`id="${tabId}"`);
      expect(html).toContain(`role="tab"`);
      expect(html).toContain(`aria-controls="${panelId}"`);
      expect(html).toContain(platform.name);

      if (platform.id === 'macos') {
        expect(html).toContain(`id="${tabId}" aria-selected="true"`);
        expect(html).toContain(`id="${panelId}" aria-labelledby="${tabId}" class="quickstart-panel"`);
        expect(html).not.toMatch(new RegExp(`id="${panelId}"[^>]*hidden`));
      } else {
        expect(html).toContain(`id="${tabId}" aria-selected="false"`);
        expect(html).toContain(`id="${panelId}" aria-labelledby="${tabId}" hidden=""`);
      }
    });
  });

  it('renders installation command snippets with pre/code blocks and copy buttons', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickstartSnippets, {
        quickstart: quickstartData,
        initialPlatform: 'macos',
      })
    );

    const macosPlatform = quickstartData.platforms.find((p) => p.id === 'macos')!;
    macosPlatform.snippets.forEach((snippet) => {
      expect(html).toContain(snippet.label);
      expect(html).toContain(`<code>${snippet.command}</code>`);
      expect(html).toContain(`aria-label="${quickstartData.copyButtonAria}: ${snippet.command}"`);
    });
  });

  it('renders screen reader status live region for polite copy notifications', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickstartSnippets, {
        quickstart: quickstartData,
        initialPlatform: 'windows',
      })
    );

    expect(html).toContain('class="quickstart-sr-status" role="status" aria-live="polite"');
  });

  it('renders localized Indonesian quickstart content correctly', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickstartSnippets, {
        quickstart: idDictionary.quickstart,
        initialPlatform: 'linux',
      })
    );

    expect(html).toContain(idDictionary.quickstart.sectionTitle);
    expect(html).toContain(idDictionary.quickstart.sectionSubtitle);
    idDictionary.quickstart.setupSteps.forEach((step: string) => {
      expect(html).toContain(step);
    });
  });
});

describe('SessionStorage Selection Persistence (TASK-035)', () => {
  beforeEach(() => {
    clearMemoryFallback();
    safeSessionStorageRemove(PLATFORM_STORAGE_KEY);
  });

  afterEach(() => {
    clearMemoryFallback();
    safeSessionStorageRemove(PLATFORM_STORAGE_KEY);
  });

  it('persists selected platform to sessionStorage under 9drive_platform_pref', () => {
    safeSessionStorageSet(PLATFORM_STORAGE_KEY, 'linux');
    expect(safeSessionStorageGet(PLATFORM_STORAGE_KEY)).toBe('linux');
  });

  it('resolveInitialPlatform prioritizes stored sessionStorage preference over auto-detection', () => {
    safeSessionStorageSet(PLATFORM_STORAGE_KEY, 'windows');

    const resolved = resolveInitialPlatform(
      enDictionary.quickstart.platforms,
      'macos',
      { userAgent: 'Macintosh', maxTouchPoints: 0 }
    );

    expect(resolved).toBe('windows');
  });

  it('resolveInitialPlatform falls back to explicit initialPlatform when sessionStorage is empty', () => {
    const resolved = resolveInitialPlatform(
      enDictionary.quickstart.platforms,
      'linux',
      { userAgent: 'Windows NT 10.0', maxTouchPoints: 0 }
    );

    expect(resolved).toBe('linux');
  });

  it('resolveInitialPlatform falls back to auto-detected OS when no storage or prop is provided', () => {
    const resolved = resolveInitialPlatform(
      enDictionary.quickstart.platforms,
      undefined,
      { userAgent: 'X11; Linux x86_64', maxTouchPoints: 0 }
    );

    expect(resolved).toBe('linux');
  });
});

describe('Clipboard Invocation & Reversion Timeout (TASK-036 & TASK-038)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('invokes clipboard.writeText with exact snippet command on success', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const customClipboard = { writeText: writeTextMock };

    const success = await copyToClipboard('brew install 9drive', customClipboard);

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith('brew install 9drive');
  });

  it('returns false and handles rejected clipboard permissions gracefully', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('NotAllowedError: Permission denied'));
    const customClipboard = { writeText: writeTextMock };

    const success = await copyToClipboard('curl -fsSL https://9drive.dev/install.sh | bash', customClipboard);

    expect(success).toBe(false);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when clipboard API is unavailable', async () => {
    const success = await copyToClipboard('irm https://9drive.dev/install.ps1 | iex', undefined);
    expect(success).toBe(false);
  });

  it('reverts visual confirmation state after 2000ms timeout', () => {
    let copiedState: string | null = 'macos-0';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const triggerCopy = (key: string) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      copiedState = key;
      timeoutId = setTimeout(() => {
        copiedState = null;
        timeoutId = null;
      }, COPY_RESET_TIMEOUT_MS);
    };

    triggerCopy('macos-0');
    expect(copiedState).toBe('macos-0');

    // Advance 1000ms - still copied
    vi.advanceTimersByTime(1000);
    expect(copiedState).toBe('macos-0');

    // Advance another 1000ms (total 2000ms) - reverted
    vi.advanceTimersByTime(1000);
    expect(copiedState).toBeNull();
  });

  it('resets timeout window to full 2000ms when user triggers another copy in rapid succession', () => {
    let copiedState: string | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const triggerCopy = (key: string) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      copiedState = key;
      timeoutId = setTimeout(() => {
        copiedState = null;
        timeoutId = null;
      }, COPY_RESET_TIMEOUT_MS);
    };

    // First copy at t = 0
    triggerCopy('macos-0');
    expect(copiedState).toBe('macos-0');

    // Advance 1500ms
    vi.advanceTimersByTime(1500);
    expect(copiedState).toBe('macos-0');

    // Second copy at t = 1500ms
    triggerCopy('macos-1');
    expect(copiedState).toBe('macos-1');

    // Advance 1000ms (t = 2500ms total, 1000ms after second copy) -> should still be macos-1!
    vi.advanceTimersByTime(1000);
    expect(copiedState).toBe('macos-1');

    // Advance another 1000ms (t = 3500ms, 2000ms after second copy) -> reverted
    vi.advanceTimersByTime(1000);
    expect(copiedState).toBeNull();
  });
});

describe('Manual Text Selection Fallback & CSS Hygiene (TASK-038)', () => {
  it('guarantees code blocks preserve text selection in CSS when clipboard is blocked', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/quickstart.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Ensure user-select: text is explicitly declared on code block
    expect(cssContent).toMatch(/user-select:\s*text/);
    // Ensure user-select: none is NOT applied to snippet command text
    expect(cssContent).not.toMatch(/\.quickstart-code-block[^}]*user-select:\s*none/);
  });
});
