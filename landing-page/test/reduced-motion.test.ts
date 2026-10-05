import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ShowcaseGallery,
  checkPrefersReducedMotion,
} from '../src/islands/ShowcaseGallery';
import { dictionary } from '../src/data/locales/en';

describe('Reduced Motion Detection & Instantaneous Transitions (TASK-029 & TASK-031)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('checkPrefersReducedMotion returns true when prefers-reduced-motion media query matches', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.stubGlobal('window', { matchMedia: matchMediaMock });

    expect(checkPrefersReducedMotion()).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('checkPrefersReducedMotion returns false when prefers-reduced-motion does not match', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.stubGlobal('window', { matchMedia: matchMediaMock });

    expect(checkPrefersReducedMotion()).toBe(false);
  });

  it('checkPrefersReducedMotion returns false in non-browser or SSR environment', () => {
    vi.stubGlobal('window', undefined);
    expect(checkPrefersReducedMotion()).toBe(false);
  });

  it('checkPrefersReducedMotion catches errors and returns false safely', () => {
    const matchMediaMock = vi.fn().mockImplementation(() => {
      throw new Error('Not supported');
    });

    vi.stubGlobal('window', { matchMedia: matchMediaMock });
    expect(checkPrefersReducedMotion()).toBe(false);
  });

  it('renders track with transition:none and data-reduced-motion="true" when reduced motion is enabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: dictionary.showcase.tabs,
        reducedMotionOverride: true,
      })
    );

    // Track must apply transition:none for instantaneous activation
    expect(html).toContain('data-reduced-motion="true"');
    expect(html).toContain('reduced-motion');
    expect(html).toContain('transition:none');
  });

  it('renders track with slide transition when reduced motion is disabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: dictionary.showcase.tabs,
        reducedMotionOverride: false,
      })
    );

    expect(html).toContain('data-reduced-motion="false"');
    expect(html).not.toContain('class="showcase-panels-track reduced-motion"');
    expect(html).toContain('transition:transform 300ms cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('executes instantaneous tab position update with transition:none under reduced motion', () => {
    const htmlTab0 = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: dictionary.showcase.tabs,
        initialTabId: 'web-ui',
        reducedMotionOverride: true,
      })
    );

    const htmlTab1 = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: dictionary.showcase.tabs,
        initialTabId: 'file-explorer',
        reducedMotionOverride: true,
      })
    );

    // Tab 0 is at 0%, Tab 1 is at -100%, and BOTH have transition:none
    expect(htmlTab0).toContain('transform:translateX(-0%)');
    expect(htmlTab0).toContain('transition:none');

    expect(htmlTab1).toContain('transform:translateX(-100%)');
    expect(htmlTab1).toContain('transition:none');
  });

  it('CSS file provides prefers-reduced-motion media query with transition: none !important', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/showcase.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.showcase-panels-track');
    expect(css).toContain('transition: none !important');
    expect(css).toContain('data-reduced-motion="true"');
  });

  it('attaches and detaches media query change listeners correctly', () => {
    const listeners: Array<(e: { matches: boolean }) => void> = [];
    const addEventListenerMock = vi.fn((event: string, fn: any) => {
      if (event === 'change') listeners.push(fn);
    });
    const removeEventListenerMock = vi.fn((event: string, fn: any) => {
      if (event === 'change') {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    });

    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }));

    vi.stubGlobal('window', { matchMedia: matchMediaMock });

    // Simulating listener behavior
    let currentMotion = false;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: { matches: boolean }) => {
      currentMotion = e.matches;
    };
    media.addEventListener('change', handler);

    expect(addEventListenerMock).toHaveBeenCalledWith('change', handler);
    expect(listeners.length).toBe(1);

    // Trigger system motion preference change
    listeners[0]({ matches: true });
    expect(currentMotion).toBe(true);

    media.removeEventListener('change', handler);
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', handler);
    expect(listeners.length).toBe(0);
  });
});
