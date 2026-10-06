import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectPlatform,
  isIPadOS,
  DEFAULT_PLATFORM,
  type NavigatorLike,
} from '../src/utils/platform-detect';

describe('CLI Quickstart Island OS Auto-Detection (TASK-034 & TASK-037)', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  describe('macOS Detection', () => {
    it('resolves to "macos" via standard Mac userAgent with 0 touch points', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('macos');
      expect(isIPadOS(nav)).toBe(false);
    });

    it('resolves to "macos" via navigator.userAgentData.platform', () => {
      const nav: NavigatorLike = {
        userAgent: '',
        userAgentData: {
          platform: 'macOS',
          mobile: false,
        },
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('macos');
      expect(isIPadOS(nav)).toBe(false);
    });

    it('resolves to "macos" for older Safari on Mac OS X', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('macos');
    });
  });

  describe('Linux Detection', () => {
    it('resolves to "linux" via standard Linux userAgent', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('linux');
      expect(isIPadOS(nav)).toBe(false);
    });

    it('resolves to "linux" via navigator.userAgentData.platform', () => {
      const nav: NavigatorLike = {
        userAgent: '',
        userAgentData: {
          platform: 'Linux',
          mobile: false,
        },
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('linux');
    });

    it('resolves to "linux" for Ubuntu/Debian/Fedora desktop browsers', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
        platform: 'Linux x86_64',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('linux');
    });
  });

  describe('Windows Detection', () => {
    it('resolves to "windows" via standard Windows 10/11 userAgent', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('windows');
      expect(isIPadOS(nav)).toBe(false);
    });

    it('resolves to "windows" via navigator.userAgentData.platform', () => {
      const nav: NavigatorLike = {
        userAgent: '',
        userAgentData: {
          platform: 'Windows',
          mobile: false,
        },
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('windows');
    });

    it('resolves to "windows" for Edge on Windows 64-bit', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        platform: 'Win32',
      };

      expect(detectPlatform(nav)).toBe('windows');
    });
  });

  describe('iPadOS Disambiguation & Touch Detection', () => {
    it('defaults to "nodejs" when iPadOS Safari desktop-mode spoofing macOS is detected (maxTouchPoints > 1)', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      };

      expect(isIPadOS(nav)).toBe(true);
      expect(detectPlatform(nav)).toBe('nodejs');
    });

    it('defaults to "nodejs" when userAgentData indicates macOS but maxTouchPoints > 1', () => {
      const nav: NavigatorLike = {
        userAgent: '',
        userAgentData: {
          platform: 'macOS',
          mobile: false,
        },
        maxTouchPoints: 5,
      };

      expect(isIPadOS(nav)).toBe(true);
      expect(detectPlatform(nav)).toBe('nodejs');
    });

    it('defaults to "nodejs" when userAgent explicitly contains iPad', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
      };

      expect(isIPadOS(nav)).toBe(true);
      expect(detectPlatform(nav)).toBe('nodejs');
    });
  });

  describe('Mobile & Undetermined Fallbacks', () => {
    it('defaults to "nodejs" on iPhone userAgent', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      };

      expect(detectPlatform(nav)).toBe('nodejs');
    });

    it('defaults to "nodejs" on Android userAgent', () => {
      const nav: NavigatorLike = {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      };

      expect(detectPlatform(nav)).toBe('nodejs');
    });

    it('defaults to "nodejs" when userAgent is undetermined or unrecognized', () => {
      const nav: NavigatorLike = {
        userAgent: 'CustomBot/2.0 (Compatible; NoOS)',
        platform: 'Unknown',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe(DEFAULT_PLATFORM);
    });

    it('defaults to "nodejs" when userAgent is empty string', () => {
      const nav: NavigatorLike = {
        userAgent: '',
        platform: '',
        maxTouchPoints: 0,
      };

      expect(detectPlatform(nav)).toBe('nodejs');
    });

    it('defaults to "nodejs" when navigator is undefined or empty', () => {
      expect(detectPlatform(undefined)).toBe('nodejs');
    });
  });

  describe('Global Navigator Integration', () => {
    it('inspects global navigator when no arguments are passed', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          platform: 'Win32',
          maxTouchPoints: 0,
        },
        configurable: true,
        writable: true,
      });

      expect(detectPlatform()).toBe('windows');
    });
  });
});
