import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ShowcaseGallery,
  evaluateSwipeGesture,
  getNextClampedIndex,
  getNextCyclicIndex,
  type TouchCoords,
} from '../src/islands/ShowcaseGallery';
import { dictionary as enDictionary } from '../src/data/locales/en';
import { dictionary as idDictionary } from '../src/data/locales/id';
import type { ShowcaseTab } from '../src/types';

describe('ShowcaseGallery Island - WAI-ARIA Semantics & Structure (TASK-026 & TASK-030)', () => {
  const sampleTabs: readonly ShowcaseTab[] = enDictionary.showcase.tabs;

  it('renders tablist with role="tablist", aria-orientation, and aria-label', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
        ariaLabel: '9Drive UI Showcase',
      })
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('aria-label="9Drive UI Showcase"');
  });

  it('renders each tab with role="tab", aria-selected, aria-controls, and id', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
        initialTabId: 'file-explorer',
      })
    );

    sampleTabs.forEach((tab) => {
      expect(html).toContain(`id="tab-${tab.id}"`);
      expect(html).toContain(`aria-controls="panel-${tab.id}"`);
      expect(html).toContain(tab.title);
    });

    // file-explorer is initialTabId, so it must be selected
    expect(html).toMatch(/id="tab-file-explorer"[^>]*aria-selected="true"/);
    expect(html).toMatch(/id="tab-file-explorer"[^>]*tabindex="0"/);

    // other tabs must be unselected
    expect(html).toMatch(/id="tab-web-ui"[^>]*aria-selected="false"/);
    expect(html).toMatch(/id="tab-web-ui"[^>]*tabindex="-1"/);
  });

  it('renders each panel with role="tabpanel", id, aria-labelledby, and tabIndex', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
        initialTabId: 'web-ui',
      })
    );

    sampleTabs.forEach((tab) => {
      expect(html).toContain(`id="panel-${tab.id}"`);
      expect(html).toContain(`role="tabpanel"`);
      expect(html).toContain(`aria-labelledby="tab-${tab.id}"`);
    });

    // web-ui is active
    expect(html).toMatch(/id="panel-web-ui"[^>]*aria-hidden="false"/);
    expect(html).toMatch(/id="panel-web-ui"[^>]*tabindex="0"/);

    // file-explorer is inactive
    expect(html).toMatch(/id="panel-file-explorer"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/id="panel-file-explorer"[^>]*tabindex="-1"/);
  });

  it('renders responsive 16:10 image container with explicit width, height, and srcset to eliminate CLS', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
      })
    );

    sampleTabs.forEach((tab) => {
      expect(html).toContain(`data-testid="showcase-image-container-${tab.id}"`);
      expect(html.toLowerCase()).toContain(`srcset="${tab.image.srcSet.toLowerCase()}"`);
      expect(html).toContain(`alt="${tab.image.alt}"`);
      expect(html).toContain(`width="${tab.image.width}"`);
      expect(html).toContain(`height="${tab.image.height}"`);
    });

    // First image is eager, subsequent are lazy
    expect(html).toMatch(/id="panel-web-ui"[\s\S]*?loading="eager"/);
    expect(html).toMatch(/id="panel-file-explorer"[\s\S]*?loading="lazy"/);
  });

  it('applies custom className and default aria-label when not provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
        className: 'custom-showcase-class',
      })
    );

    expect(html).toContain('custom-showcase-class');
    expect(html).toContain('aria-label="Feature showcase"');
  });

  it('falls back to index 0 when initialTabId does not exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: sampleTabs,
        initialTabId: 'non-existent-tab',
      })
    );

    expect(html).toMatch(/id="tab-web-ui"[^>]*aria-selected="true"/);
    expect(html).toMatch(/id="panel-web-ui"[^>]*aria-hidden="false"/);
  });

  it('renders indonesian locale showcase tabs cleanly', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: idDictionary.showcase.tabs,
        ariaLabel: idDictionary.showcase.sectionTitle,
      })
    );

    idDictionary.showcase.tabs.forEach((tab) => {
      expect(html).toContain(tab.title);
      expect(html).toContain(`id="tab-${tab.id}"`);
    });
  });

  it('returns null when tabs array is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShowcaseGallery, {
        tabs: [],
      })
    );

    expect(html).toBe('');
  });
});

describe('ShowcaseGallery - Keyboard Navigation & selectionFollowsFocus (TASK-027 & TASK-030)', () => {
  const totalTabs = 4;

  it('getNextCyclicIndex handles ArrowRight with cyclic looping', () => {
    expect(getNextCyclicIndex(0, 'ArrowRight', totalTabs)).toBe(1);
    expect(getNextCyclicIndex(1, 'ArrowRight', totalTabs)).toBe(2);
    expect(getNextCyclicIndex(2, 'ArrowRight', totalTabs)).toBe(3);
    // Boundary wrap from last tab to first tab
    expect(getNextCyclicIndex(3, 'ArrowRight', totalTabs)).toBe(0);
  });

  it('getNextCyclicIndex handles ArrowLeft with cyclic looping', () => {
    // Boundary wrap from first tab to last tab
    expect(getNextCyclicIndex(0, 'ArrowLeft', totalTabs)).toBe(3);
    expect(getNextCyclicIndex(3, 'ArrowLeft', totalTabs)).toBe(2);
    expect(getNextCyclicIndex(2, 'ArrowLeft', totalTabs)).toBe(1);
    expect(getNextCyclicIndex(1, 'ArrowLeft', totalTabs)).toBe(0);
  });

  it('getNextCyclicIndex handles Home and End keys', () => {
    expect(getNextCyclicIndex(2, 'Home', totalTabs)).toBe(0);
    expect(getNextCyclicIndex(3, 'Home', totalTabs)).toBe(0);
    expect(getNextCyclicIndex(0, 'End', totalTabs)).toBe(3);
    expect(getNextCyclicIndex(1, 'End', totalTabs)).toBe(3);
  });

  it('getNextCyclicIndex ignores unrelated keys', () => {
    expect(getNextCyclicIndex(2, 'Tab', totalTabs)).toBe(2);
    expect(getNextCyclicIndex(2, 'Enter', totalTabs)).toBe(2);
    expect(getNextCyclicIndex(2, 'Escape', totalTabs)).toBe(2);
    expect(getNextCyclicIndex(2, 'ArrowUp', totalTabs)).toBe(2);
  });

  it('getNextCyclicIndex handles 0 or 1 tab gracefully', () => {
    expect(getNextCyclicIndex(0, 'ArrowRight', 0)).toBe(0);
    expect(getNextCyclicIndex(0, 'ArrowRight', 1)).toBe(0);
    expect(getNextCyclicIndex(0, 'ArrowLeft', 1)).toBe(0);
  });
});

describe('ShowcaseGallery - Touch Gestures, Suppression & Clamping (TASK-028 & TASK-030)', () => {
  it('evaluateSwipeGesture detects valid horizontal swipe left (|deltaX| > 50, |deltaY| < 40)', () => {
    const start: TouchCoords = { clientX: 200, clientY: 100 };
    const end: TouchCoords = { clientX: 120, clientY: 110 }; // deltaX = -80, deltaY = 10

    const result = evaluateSwipeGesture(start, end, false);
    expect(result.isSwipe).toBe(true);
    expect(result.direction).toBe('left');
    expect(result.deltaX).toBe(-80);
    expect(result.deltaY).toBe(10);
    expect(result.suppressed).toBe(false);
  });

  it('evaluateSwipeGesture detects valid horizontal swipe right (|deltaX| > 50, |deltaY| < 40)', () => {
    const start: TouchCoords = { clientX: 100, clientY: 100 };
    const end: TouchCoords = { clientX: 180, clientY: 95 }; // deltaX = 80, deltaY = -5

    const result = evaluateSwipeGesture(start, end, false);
    expect(result.isSwipe).toBe(true);
    expect(result.direction).toBe('right');
    expect(result.deltaX).toBe(80);
    expect(result.deltaY).toBe(-5);
    expect(result.suppressed).toBe(false);
  });

  it('evaluateSwipeGesture ignores gestures below horizontal threshold (|deltaX| <= 50)', () => {
    const start: TouchCoords = { clientX: 100, clientY: 100 };
    const end: TouchCoords = { clientX: 140, clientY: 105 }; // deltaX = 40 <= 50

    const result = evaluateSwipeGesture(start, end, false);
    expect(result.isSwipe).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.suppressed).toBe(false);
  });

  it('evaluateSwipeGesture ignores vertical scrolling gestures (|deltaY| >= 40)', () => {
    const start: TouchCoords = { clientX: 100, clientY: 100 };
    const end: TouchCoords = { clientX: 180, clientY: 160 }; // deltaX = 80, deltaY = 60 >= 40

    const result = evaluateSwipeGesture(start, end, false);
    expect(result.isSwipe).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.suppressed).toBe(false);
  });

  it('evaluateSwipeGesture suppresses multi-touch inputs', () => {
    const start: TouchCoords = { clientX: 200, clientY: 100 };
    const end: TouchCoords = { clientX: 100, clientY: 105 };

    const result = evaluateSwipeGesture(start, end, true);
    expect(result.isSwipe).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.suppressed).toBe(true);
  });

  it('getNextClampedIndex clamps strictly at boundaries without circular looping', () => {
    const totalTabs = 4;

    // At first tab (0): swiping right (direction: 'right') must clamp at 0
    expect(getNextClampedIndex(0, 'right', totalTabs)).toBe(0);

    // At first tab (0): swiping left moves to next tab (1)
    expect(getNextClampedIndex(0, 'left', totalTabs)).toBe(1);

    // Mid tabs: swiping moves forward/backward
    expect(getNextClampedIndex(1, 'left', totalTabs)).toBe(2);
    expect(getNextClampedIndex(2, 'right', totalTabs)).toBe(1);

    // At last tab (3): swiping left (direction: 'left') must clamp at 3 (NO circular looping)
    expect(getNextClampedIndex(3, 'left', totalTabs)).toBe(3);

    // At last tab (3): swiping right moves back to 2
    expect(getNextClampedIndex(3, 'right', totalTabs)).toBe(2);
  });

  it('getNextClampedIndex handles 0 total tabs safely', () => {
    expect(getNextClampedIndex(0, 'left', 0)).toBe(0);
    expect(getNextClampedIndex(0, 'right', 0)).toBe(0);
  });
});

describe('Showcase Stylesheet Verification (TASK-025)', () => {
  const cssPath = path.resolve(__dirname, '../src/styles/showcase.css');

  it('showcase.css exists and contains required styles', () => {
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('.showcase-gallery');
    expect(cssContent).toContain('.showcase-tablist');
    expect(cssContent).toContain('.showcase-tab');
    expect(cssContent).toContain('.showcase-viewport');
    expect(cssContent).toContain('.showcase-panels-track');
    expect(cssContent).toContain('.showcase-image-container');
    expect(cssContent).toContain('aspect-ratio: 16 / 10');
    expect(cssContent).toContain('prefers-reduced-motion: reduce');
    expect(cssContent).toContain('data-reduced-motion');
  });
});
