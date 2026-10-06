/**
 * Default sticky navbar height offset in pixels (5rem = 80px).
 */
export const DEFAULT_NAVBAR_OFFSET = 80;

/**
 * Checks whether the user has requested reduced motion via prefers-reduced-motion media query.
 * Resilient against non-browser or SSR environments.
 */
export function checkPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface ScrollOptions {
  /**
   * Offset in pixels from top to compensate for sticky headers. Defaults to 80 (5rem).
   */
  readonly offset?: number;
  /**
   * Scroll behavior. Defaults to 'smooth' (unless reduced motion is active, which defaults to 'instant').
   */
  readonly behavior?: 'smooth' | 'auto' | 'instant';
  /**
   * Explicit override for reduced motion preference (useful for testing or explicit settings).
   */
  readonly reducedMotion?: boolean;
}

/**
 * Pure calculation helper: calculates target scroll Y position after applying offset compensation.
 * Clamped to 0 at minimum.
 */
export function calculateScrollPosition(
  targetTop: number,
  currentScrollY: number,
  offset: number = DEFAULT_NAVBAR_OFFSET
): number {
  return Math.max(0, targetTop + currentScrollY - offset);
}

/**
 * Resolves a target element given a CSS selector or ID hash.
 */
export function resolveTargetElement(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') {
    return target;
  }
  if (typeof document === 'undefined') {
    return null;
  }
  const cleanId = target.replace(/^#/, '');
  // Try finding by exact ID first
  const byId = document.getElementById(cleanId);
  if (byId) return byId;

  // Try querySelector if valid selector
  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

/**
 * Executes offset-aware scrolling to a target element or anchor ID, respecting reduced motion preferences.
 * Returns true if target was found and scrolled to, false otherwise.
 */
export function scrollToTarget(
  target: string | HTMLElement,
  options: ScrollOptions = {}
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const element = resolveTargetElement(target);
  if (!element) {
    return false;
  }

  const offset = options.offset ?? DEFAULT_NAVBAR_OFFSET;
  const isReduced = options.reducedMotion ?? checkPrefersReducedMotion();

  // Instantaneous jump if reduced motion is requested
  const behavior: ScrollBehavior = isReduced
    ? 'instant'
    : (options.behavior ?? 'smooth');

  const rect = element.getBoundingClientRect();
  const currentScrollY = window.scrollY ?? window.pageYOffset ?? 0;
  const targetY = calculateScrollPosition(rect.top, currentScrollY, offset);

  try {
    window.scrollTo({
      top: targetY,
      behavior,
    });
    return true;
  } catch {
    // Fallback for older environments without options object support
    try {
      window.scrollTo(0, targetY);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Intercepts internal anchor navigation (clicks on `a[href^="#"]`) to apply offset-aware scrolling.
 * Returns a cleanup unsubscribe function.
 */
export function setupInternalAnchorScrolling(options: ScrollOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('#') || href === '#') return;

    const targetElement = resolveTargetElement(href);
    if (targetElement) {
      e.preventDefault();
      scrollToTarget(targetElement, options);
      if (typeof window.history?.pushState === 'function') {
        window.history.pushState(null, '', href);
      }
    }
  };

  document.addEventListener('click', handleClick);
  return () => {
    document.removeEventListener('click', handleClick);
  };
}
