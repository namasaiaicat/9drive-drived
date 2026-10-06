import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FaqAccordion,
  toggleAccordionItem,
  getNextAccordionIndex,
} from '../src/islands/FaqAccordion';
import {
  DEFAULT_NAVBAR_OFFSET,
  checkPrefersReducedMotion,
  calculateScrollPosition,
  resolveTargetElement,
  scrollToTarget,
  setupInternalAnchorScrolling,
} from '../src/utils/scroll';
import { dictionary as enDictionary } from '../src/data/locales/en';
import { dictionary as idDictionary } from '../src/data/locales/id';
import type { FaqItem } from '../src/types';

describe('FAQ Accordion Island & ARIA Semantics (TASK-040 & TASK-041)', () => {
  const sampleItems: readonly FaqItem[] = enDictionary.faq.items;

  it('renders accordion container and all FAQ items', () => {
    const html = renderToStaticMarkup(
      React.createElement(FaqAccordion, { items: sampleItems })
    );

    expect(html).toContain('class="faq-accordion"');
    sampleItems.forEach((item) => {
      expect(html).toContain(item.question);
      expect(html).toContain(item.answer);
    });
  });

  it('binds WAI-ARIA attributes (aria-controls, aria-expanded, aria-labelledby, role="region")', () => {
    const html = renderToStaticMarkup(
      React.createElement(FaqAccordion, {
        items: sampleItems,
        initialExpandedId: 'storage-quotas',
      })
    );

    sampleItems.forEach((item) => {
      const buttonId = `faq-btn-${item.id}`;
      const panelId = `faq-panel-${item.id}`;

      expect(html).toContain(`id="${buttonId}"`);
      expect(html).toContain(`aria-controls="${panelId}"`);
      expect(html).toContain(`id="${panelId}"`);
      expect(html).toContain(`aria-labelledby="${buttonId}"`);
      expect(html).toContain('role="region"');
    });

    // storage-quotas is expanded
    expect(html).toMatch(/id="faq-btn-storage-quotas"[^>]*aria-expanded="true"/);
    expect(html).toMatch(/id="faq-panel-storage-quotas"[^>]*data-expanded="true"/);
    expect(html).not.toMatch(/id="faq-panel-storage-quotas"[^>]*hidden/);

    // other items are collapsed
    expect(html).toMatch(/id="faq-btn-oauth-credential-isolation"[^>]*aria-expanded="false"/);
    expect(html).toMatch(/id="faq-panel-oauth-credential-isolation"[^>]*hidden/);
  });

  it('defaults to all items collapsed when initialExpandedId is null or omitted', () => {
    const html = renderToStaticMarkup(
      React.createElement(FaqAccordion, { items: sampleItems })
    );

    sampleItems.forEach((item) => {
      expect(html).toMatch(new RegExp(`id="faq-btn-${item.id}"[^>]*aria-expanded="false"`));
      expect(html).toMatch(new RegExp(`id="faq-panel-${item.id}"[^>]*hidden`));
    });
  });

  it('supports custom headingLevel (e.g. h2) and idPrefix', () => {
    const html = renderToStaticMarkup(
      React.createElement(FaqAccordion, {
        items: sampleItems,
        headingLevel: 'h2',
        idPrefix: 'custom-faq',
      })
    );

    expect(html).toContain('<h2 class="faq-accordion-heading">');
    expect(html).toContain('id="custom-faq-btn-storage-quotas"');
    expect(html).toContain('id="custom-faq-panel-storage-quotas"');
  });
});

describe('Single-Expansion State Machine Invariant (TASK-040)', () => {
  it('toggleAccordionItem expands unexpanded item when initially null', () => {
    const result = toggleAccordionItem(null, 'storage-quotas');
    expect(result).toBe('storage-quotas');
  });

  it('toggleAccordionItem collapses the active item when clicked again (toggle collapse)', () => {
    const result = toggleAccordionItem('storage-quotas', 'storage-quotas');
    expect(result).toBeNull();
  });

  it('toggleAccordionItem closes active item and opens new item on direct switch', () => {
    const result = toggleAccordionItem('storage-quotas', 'encryption');
    expect(result).toBe('encryption');
  });

  it('maintains single-expansion invariant across consecutive state transitions', () => {
    let current: string | null = null;

    // 1. Expand item A
    current = toggleAccordionItem(current, 'item-a');
    expect(current).toBe('item-a');

    // 2. Switch directly to item B (item A automatically collapses)
    current = toggleAccordionItem(current, 'item-b');
    expect(current).toBe('item-b');

    // 3. Switch directly to item C
    current = toggleAccordionItem(current, 'item-c');
    expect(current).toBe('item-c');

    // 4. Toggle item C collapses it to null
    current = toggleAccordionItem(current, 'item-c');
    expect(current).toBeNull();
  });
});

describe('Accordion Keyboard Navigation & APG Focus Cycling (TASK-041)', () => {
  const total = 5;

  it('ArrowDown advances index cyclically', () => {
    expect(getNextAccordionIndex(0, total, 'ArrowDown')).toBe(1);
    expect(getNextAccordionIndex(3, total, 'ArrowDown')).toBe(4);
    expect(getNextAccordionIndex(4, total, 'ArrowDown')).toBe(0); // wraps around
  });

  it('ArrowUp decrements index cyclically', () => {
    expect(getNextAccordionIndex(2, total, 'ArrowUp')).toBe(1);
    expect(getNextAccordionIndex(0, total, 'ArrowUp')).toBe(4); // wraps around
  });

  it('Home jumps to first item (index 0)', () => {
    expect(getNextAccordionIndex(3, total, 'Home')).toBe(0);
    expect(getNextAccordionIndex(4, total, 'Home')).toBe(0);
  });

  it('End jumps to last item (total - 1)', () => {
    expect(getNextAccordionIndex(0, total, 'End')).toBe(4);
    expect(getNextAccordionIndex(2, total, 'End')).toBe(4);
  });

  it('returns current index for unhandled keys or empty list', () => {
    expect(getNextAccordionIndex(2, total, 'Tab')).toBe(2);
    expect(getNextAccordionIndex(0, 0, 'ArrowDown')).toBe(0);
  });
});

describe('Offset-Aware Anchor Scrolling & Motion Preferences (TASK-042)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('checkPrefersReducedMotion detects prefers-reduced-motion: reduce', () => {
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

  it('checkPrefersReducedMotion returns false when no reduced motion or window undefined', () => {
    const matchMediaMock = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.stubGlobal('window', { matchMedia: matchMediaMock });
    expect(checkPrefersReducedMotion()).toBe(false);

    vi.stubGlobal('window', undefined);
    expect(checkPrefersReducedMotion()).toBe(false);
  });

  it('calculateScrollPosition applies 80px (5rem) offset compensation and clamps to 0', () => {
    expect(DEFAULT_NAVBAR_OFFSET).toBe(80);

    // Target is at 500px from viewport top, current scroll is 100px -> absolute 600px -> minus 80 = 520px
    expect(calculateScrollPosition(500, 100, 80)).toBe(520);

    // Target is near top (30px), scroll 0 -> 30 - 80 = -50 -> clamped to 0
    expect(calculateScrollPosition(30, 0, 80)).toBe(0);

    // Custom offset (100px)
    expect(calculateScrollPosition(1000, 0, 100)).toBe(900);
  });

  it('scrollToTarget performs smooth scroll when reduced motion is disabled', () => {
    const scrollToMock = vi.fn();
    const mockElement = {
      getBoundingClientRect: () => ({ top: 400 }),
    } as unknown as HTMLElement;

    vi.stubGlobal('window', {
      scrollY: 100,
      pageYOffset: 100,
      scrollTo: scrollToMock,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });

    const success = scrollToTarget(mockElement, { offset: 80, reducedMotion: false });
    expect(success).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 420, // 400 + 100 - 80
      behavior: 'smooth',
    });
  });

  it('scrollToTarget performs instantaneous scroll jump when prefers-reduced-motion is active', () => {
    const scrollToMock = vi.fn();
    const mockElement = {
      getBoundingClientRect: () => ({ top: 600 }),
    } as unknown as HTMLElement;

    vi.stubGlobal('window', {
      scrollY: 200,
      pageYOffset: 200,
      scrollTo: scrollToMock,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });

    const success = scrollToTarget(mockElement, { offset: 80, reducedMotion: true });
    expect(success).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 720, // 600 + 200 - 80
      behavior: 'instant',
    });
  });

  it('scrollToTarget resolves element by string id or hash selector', () => {
    const scrollToMock = vi.fn();
    const mockElement = {
      getBoundingClientRect: () => ({ top: 300 }),
    } as unknown as HTMLElement;

    const getElementByIdMock = vi.fn().mockImplementation((id: string) => {
      if (id === 'faq') return mockElement;
      return null;
    });

    vi.stubGlobal('document', {
      getElementById: getElementByIdMock,
      querySelector: vi.fn(),
    });

    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo: scrollToMock,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });

    // Test with leading hash
    const res1 = scrollToTarget('#faq');
    expect(res1).toBe(true);
    expect(getElementByIdMock).toHaveBeenCalledWith('faq');

    // Test without leading hash
    const res2 = scrollToTarget('faq');
    expect(res2).toBe(true);
  });

  it('scrollToTarget returns false when target element is not found or window is undefined', () => {
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(null),
      querySelector: vi.fn().mockReturnValue(null),
    });

    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });

    expect(scrollToTarget('non-existent')).toBe(false);

    vi.stubGlobal('window', undefined);
    expect(scrollToTarget('faq')).toBe(false);
  });

  it('setupInternalAnchorScrolling intercepts anchor clicks and triggers offset scrolling', () => {
    let capturedHandler: ((e: any) => void) | null = null;
    const addEventListenerMock = vi.fn((event: string, fn: any) => {
      if (event === 'click') capturedHandler = fn;
    });
    const removeEventListenerMock = vi.fn();

    const mockAnchor = {
      getAttribute: (attr: string) => (attr === 'href' ? '#faq' : null),
    };
    const mockTarget = {
      closest: (selector: string) => (selector === 'a' ? mockAnchor : null),
    };

    const targetElement = {
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as HTMLElement;

    const pushStateMock = vi.fn();
    const scrollToMock = vi.fn();

    vi.stubGlobal('document', {
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      getElementById: (id: string) => (id === 'faq' ? targetElement : null),
      querySelector: vi.fn(),
    });

    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo: scrollToMock,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      history: { pushState: pushStateMock },
    });

    const cleanup = setupInternalAnchorScrolling({ offset: 80 });
    expect(addEventListenerMock).toHaveBeenCalledWith('click', expect.any(Function));

    // Simulate clicking an anchor
    const mockEvent = {
      target: mockTarget,
      preventDefault: vi.fn(),
    };
    capturedHandler!(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 420,
      behavior: 'smooth',
    });
    expect(pushStateMock).toHaveBeenCalledWith(null, '', '#faq');

    // Cleanup removes listener
    cleanup();
    expect(removeEventListenerMock).toHaveBeenCalledWith('click', capturedHandler);
  });
});

describe('FAQ Content & Topics Coverage (TASK-043)', () => {
  const requiredTopics = [
    'storage-quotas',
    'oauth-credential-isolation',
    'encryption',
    'local-data-persistence',
  ];

  it('English dictionary covers storage quotas, OAuth isolation, encryption, and local persistence', () => {
    const items = enDictionary.faq.items;
    const itemIds = items.map((i) => i.id);

    requiredTopics.forEach((topic) => {
      expect(itemIds).toContain(topic);
    });

    items.forEach((item) => {
      expect(item.question.length).toBeGreaterThan(15);
      expect(item.answer.length).toBeGreaterThan(40);
    });
  });

  it('Indonesian dictionary covers storage quotas, OAuth isolation, encryption, and local persistence', () => {
    const items = idDictionary.faq.items;
    const itemIds = items.map((i) => i.id);

    requiredTopics.forEach((topic) => {
      expect(itemIds).toContain(topic);
    });

    items.forEach((item) => {
      expect(item.question.length).toBeGreaterThan(15);
      expect(item.answer.length).toBeGreaterThan(40);
    });
  });
});

describe('CSS Style Rules & Offset Specifications', () => {
  it('faq.css defines scroll-margin-top: 5rem and reduced-motion reset', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/faq.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('scroll-margin-top: 5rem');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important');
    expect(css).toContain('.faq-accordion');
    expect(css).toContain('.faq-accordion-item');
    expect(css).toContain('.faq-accordion-button');
    expect(css).toContain('.faq-accordion-panel');
  });
});
