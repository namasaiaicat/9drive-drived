import { describe, it, expect } from 'vitest';
import { dictionary as enDict } from '../src/data/locales/en';
import { dictionary as idDict } from '../src/data/locales/id';
import type { Dictionary } from '../src/types';

describe('Shared Types, Dictionaries & Metadata Configuration (TASK-001)', () => {
  it('enDict conforms to Dictionary interface with correct metadata', () => {
    const dict: Dictionary = enDict;
    expect(dict.meta.title).toContain('9Drive');
    expect(dict.meta.canonicalUrl).toBe('https://9drive.dev/en');
    expect(dict.meta.ogLocale).toBe('en_US');
    expect(dict.meta.ogAlternateLocale).toBe('id_ID');
    expect(dict.meta.ogImage).toBe('https://9drive.dev/og-image.png');
    expect(dict.meta.twitterImage).toBe('https://9drive.dev/og-image.png');
  });

  it('idDict conforms to Dictionary interface with correct metadata', () => {
    const dict: Dictionary = idDict;
    expect(dict.meta.title).toContain('9Drive');
    expect(dict.meta.canonicalUrl).toBe('https://9drive.dev/id');
    expect(dict.meta.ogLocale).toBe('id_ID');
    expect(dict.meta.ogAlternateLocale).toBe('en_US');
    expect(dict.meta.ogImage).toBe('https://9drive.dev/og-image.png');
    expect(dict.meta.twitterImage).toBe('https://9drive.dev/og-image.png');
  });

  it('both dictionaries contain all required section keys with content', () => {
    for (const dict of [enDict, idDict]) {
      expect(dict.nav).toBeDefined();
      expect(dict.hero).toBeDefined();
      expect(dict.showcase).toBeDefined();
      expect(dict.features).toBeDefined();
      expect(dict.quickstart).toBeDefined();
      expect(dict.faq).toBeDefined();
      expect(dict.footer).toBeDefined();

      expect(dict.showcase.tabs.length).toBeGreaterThanOrEqual(4);
      expect(dict.features.cards.length).toBeGreaterThanOrEqual(4);
      expect(dict.quickstart.platforms.length).toBeGreaterThanOrEqual(4);
      expect(dict.faq.items.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('Open Graph and Twitter card formats meet specification requirements', () => {
    expect(enDict.meta.ogImage).toMatch(/^https:\/\//);
    expect(idDict.meta.ogImage).toMatch(/^https:\/\//);
    expect(enDict.meta.twitterImage).toMatch(/^https:\/\//);
    expect(idDict.meta.twitterImage).toMatch(/^https:\/\//);
  });
});
