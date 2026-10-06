import type { PlatformId } from '../types';

export const DEFAULT_PLATFORM: PlatformId = 'nodejs';
export const PLATFORM_STORAGE_KEY = '9drive_platform_pref';

export interface NavigatorUserAgentData {
  readonly platform?: string;
  readonly mobile?: boolean;
  readonly brands?: ReadonlyArray<{ brand: string; version: string }>;
}

export interface NavigatorLike {
  readonly userAgent?: string;
  readonly platform?: string;
  readonly maxTouchPoints?: number;
  readonly userAgentData?: NavigatorUserAgentData;
}

/**
 * Disambiguates iPadOS desktop mode Safari from genuine macOS Safari.
 * In desktop mode, iPadOS reports "Macintosh; Intel Mac OS X" but has maxTouchPoints > 1.
 */
export function isIPadOS(nav?: NavigatorLike): boolean {
  if (!nav) return false;

  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const maxTouchPoints = nav.maxTouchPoints ?? 0;

  // Direct iPad string in UA
  if (/iPad/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ desktop-mode Safari spoofing macOS
  const isMacPlatform = /Macintosh|MacIntel|Mac OS/i.test(ua) || /Mac/i.test(platform) || /macOS/i.test(nav.userAgentData?.platform || '');
  if (isMacPlatform && maxTouchPoints > 1) {
    return true;
  }

  return false;
}

/**
 * Inspects navigator.userAgentData or navigator.userAgent to detect client operating system.
 * Defaults to 'nodejs' when undetermined or when iPadOS desktop-mode touch is detected (maxTouchPoints > 1).
 */
export function detectPlatform(customNav?: NavigatorLike | null): PlatformId {
  const nav: NavigatorLike | undefined =
    arguments.length > 0
      ? (customNav ?? undefined)
      : typeof navigator !== 'undefined'
      ? navigator
      : undefined;

  if (!nav) {
    return DEFAULT_PLATFORM;
  }

  const maxTouchPoints = nav.maxTouchPoints ?? 0;
  const ua = nav.userAgent || '';
  const platformStr = nav.platform || '';
  const uadPlatform = nav.userAgentData?.platform || '';

  // Disambiguate iPadOS touch devices masquerading as macOS
  if (isIPadOS(nav)) {
    return DEFAULT_PLATFORM;
  }

  // Other mobile devices (iPhone, iPod, Android) default to nodejs
  if (/iPhone|iPod|Android|Mobile/i.test(ua)) {
    return DEFAULT_PLATFORM;
  }

  // 1. Inspect navigator.userAgentData if available
  if (uadPlatform) {
    if (/^mac/i.test(uadPlatform)) {
      return maxTouchPoints > 1 ? DEFAULT_PLATFORM : 'macos';
    }
    if (/^win/i.test(uadPlatform)) {
      return 'windows';
    }
    if (/^linux/i.test(uadPlatform)) {
      return 'linux';
    }
  }

  // 2. Fallback to navigator.userAgent and navigator.platform
  if (/Windows|Win32|Win64|WOW64/i.test(ua) || /^Win/i.test(platformStr)) {
    return 'windows';
  }

  if (/Macintosh|Mac OS X|Mac_PowerPC/i.test(ua) || /^Mac/i.test(platformStr)) {
    return maxTouchPoints > 1 ? DEFAULT_PLATFORM : 'macos';
  }

  if (/Linux|X11/i.test(ua) || /^Linux/i.test(platformStr)) {
    return 'linux';
  }

  return DEFAULT_PLATFORM;
}
