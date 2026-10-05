import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type TouchEvent,
} from 'react';
import type { ShowcaseTab } from '../types';
import '../styles/showcase.css';

export interface TouchCoords {
  clientX: number;
  clientY: number;
}

export interface SwipeCalculationResult {
  isSwipe: boolean;
  direction: 'left' | 'right' | null;
  deltaX: number;
  deltaY: number;
  suppressed: boolean;
}

/**
 * Evaluates whether a touch sequence constitutes a single-touch horizontal swipe.
 * Thresholds: |deltaX| > 50px and |deltaY| < 40px.
 * Multi-touch inputs (touches.length > 1) suppress swipe transitions.
 */
export function evaluateSwipeGesture(
  start: TouchCoords,
  end: TouchCoords,
  isMultiTouch: boolean
): SwipeCalculationResult {
  const deltaX = end.clientX - start.clientX;
  const deltaY = end.clientY - start.clientY;

  if (isMultiTouch) {
    return {
      isSwipe: false,
      direction: null,
      deltaX,
      deltaY,
      suppressed: true,
    };
  }

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX > 50 && absY < 40) {
    return {
      isSwipe: true,
      direction: deltaX < 0 ? 'left' : 'right',
      deltaX,
      deltaY,
      suppressed: false,
    };
  }

  return {
    isSwipe: false,
    direction: null,
    deltaX,
    deltaY,
    suppressed: false,
  };
}

/**
 * Calculates the next tab index for swipe navigation, clamping strictly
 * at boundaries without circular looping.
 * - Swipe left: moves to next tab, clamped at totalTabs - 1
 * - Swipe right: moves to previous tab, clamped at 0
 */
export function getNextClampedIndex(
  currentIndex: number,
  direction: 'left' | 'right',
  totalTabs: number
): number {
  if (totalTabs <= 0) return 0;
  if (direction === 'left') {
    return Math.min(currentIndex + 1, totalTabs - 1);
  }
  if (direction === 'right') {
    return Math.max(currentIndex - 1, 0);
  }
  return currentIndex;
}

/**
 * Calculates the next tab index for keyboard navigation, wrapping cyclically.
 * - ArrowRight: next tab, looping to 0
 * - ArrowLeft: previous tab, looping to totalTabs - 1
 * - Home: 0
 * - End: totalTabs - 1
 */
export function getNextCyclicIndex(
  currentIndex: number,
  key: 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End' | string,
  totalTabs: number
): number {
  if (totalTabs <= 0) return 0;
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % totalTabs;
    case 'ArrowLeft':
      return (currentIndex - 1 + totalTabs) % totalTabs;
    case 'Home':
      return 0;
    case 'End':
      return totalTabs - 1;
    default:
      return currentIndex;
  }
}

/**
 * Resolves whether the environment prefers reduced motion.
 */
export function checkPrefersReducedMotion(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
  return false;
}

export interface ShowcaseGalleryProps {
  tabs: readonly ShowcaseTab[];
  ariaLabel?: string;
  initialTabId?: string;
  className?: string;
  reducedMotionOverride?: boolean;
  onTabChange?: (tabId: string) => void;
}

/**
 * ShowcaseGallery Island:
 * - WAI-ARIA tablist semantics (role="tablist", role="tab", role="tabpanel", aria-selected, aria-controls, aria-labelledby)
 * - selectionFollowsFocus keyboard navigation (ArrowLeft, ArrowRight, Home, End) with cyclic activation
 * - Single-touch horizontal swipe gestures (|deltaX| > 50px, |deltaY| < 40px) with boundary clamping
 * - Multi-touch inputs (touches.length > 1) suppress swipe transitions
 * - prefers-reduced-motion media query listener to disable slide animations instantaneously
 * - Explicit 16:10 aspect ratio and responsive srcset to prevent CLS
 */
export const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({
  tabs,
  ariaLabel = 'Feature showcase',
  initialTabId,
  className = '',
  reducedMotionOverride,
  onTabChange,
}) => {
  const totalTabs = tabs.length;

  const resolveInitialIndex = (): number => {
    if (!initialTabId || totalTabs === 0) return 0;
    const foundIndex = tabs.findIndex((t) => t.id === initialTabId);
    return foundIndex >= 0 ? foundIndex : 0;
  };

  const [activeIndex, setActiveIndex] = useState<number>(resolveInitialIndex);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (reducedMotionOverride !== undefined) return reducedMotionOverride;
    return checkPrefersReducedMotion();
  });

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartRef = useRef<TouchCoords | null>(null);
  const touchCurrentRef = useRef<TouchCoords | null>(null);
  const isMultiTouchRef = useRef<boolean>(false);

  // Sync reducedMotion with prop override or system preference
  useEffect(() => {
    if (reducedMotionOverride !== undefined) {
      setReducedMotion(reducedMotionOverride);
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setReducedMotion(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMotionChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleMotionChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMotionChange);
      } else if (typeof (mediaQuery as any).removeListener === 'function') {
        (mediaQuery as any).removeListener(handleMotionChange);
      }
    };
  }, [reducedMotionOverride]);

  const selectTab = useCallback(
    (nextIndex: number, shouldFocus: boolean = true) => {
      if (totalTabs === 0) return;
      const clampedIndex = Math.max(0, Math.min(nextIndex, totalTabs - 1));
      setActiveIndex(clampedIndex);
      if (shouldFocus) {
        tabRefs.current[clampedIndex]?.focus();
      }
      onTabChange?.(tabs[clampedIndex].id);
    },
    [totalTabs, tabs, onTabChange]
  );

  // WAI-ARIA Keyboard Navigation: selectionFollowsFocus
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const navKeys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!navKeys.includes(e.key)) {
        return;
      }

      e.preventDefault();
      const nextIndex = getNextCyclicIndex(currentIndex, e.key, totalTabs);
      selectTab(nextIndex, true);
    },
    [totalTabs, selectTab]
  );

  // Mobile Touch Swipe Handling
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 1) {
      isMultiTouchRef.current = true;
      touchStartRef.current = null;
      touchCurrentRef.current = null;
      return;
    }

    isMultiTouchRef.current = false;
    const touch = e.touches[0];
    touchStartRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    touchCurrentRef.current = { clientX: touch.clientX, clientY: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 1) {
      isMultiTouchRef.current = true;
      return;
    }

    if (!isMultiTouchRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      touchCurrentRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      // If there are still active touches on the screen, multi-touch occurred
      if (e.touches.length > 0) {
        isMultiTouchRef.current = true;
      }

      if (isMultiTouchRef.current || !touchStartRef.current || !touchCurrentRef.current) {
        // Suppress gesture and reset
        touchStartRef.current = null;
        touchCurrentRef.current = null;
        isMultiTouchRef.current = false;
        return;
      }

      const swipeResult = evaluateSwipeGesture(
        touchStartRef.current,
        touchCurrentRef.current,
        isMultiTouchRef.current
      );

      if (swipeResult.isSwipe && swipeResult.direction) {
        const nextIndex = getNextClampedIndex(activeIndex, swipeResult.direction, totalTabs);
        if (nextIndex !== activeIndex) {
          selectTab(nextIndex, false);
        }
      }

      touchStartRef.current = null;
      touchCurrentRef.current = null;
      isMultiTouchRef.current = false;
    },
    [activeIndex, totalTabs, selectTab]
  );

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    touchCurrentRef.current = null;
    isMultiTouchRef.current = false;
  }, []);

  if (totalTabs === 0) {
    return null;
  }

  const trackTransform = `translateX(-${activeIndex * 100}%)`;
  const trackTransition = reducedMotion
    ? 'none'
    : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <section
      className={`showcase-gallery ${className}`.trim()}
      data-testid="showcase-gallery"
      aria-label={ariaLabel}
    >
      {/* WAI-ARIA Tablist */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="showcase-tablist"
        data-testid="showcase-tablist"
      >
        {tabs.map((tab, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              data-testid={`showcase-tab-${tab.id}`}
              data-index={index}
              className={`showcase-tab ${isSelected ? 'showcase-tab--active' : ''}`}
              onClick={() => selectTab(index, true)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      {/* Showcase Viewport & Sliding Track with Touch Listeners */}
      <div
        className="showcase-viewport"
        data-testid="showcase-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div
          className={`showcase-panels-track ${reducedMotion ? 'reduced-motion' : ''}`.trim()}
          data-testid="showcase-panels-track"
          data-reduced-motion={reducedMotion ? 'true' : 'false'}
          data-active-index={activeIndex}
          style={{
            transform: trackTransform,
            transition: trackTransition,
          }}
        >
          {tabs.map((tab, index) => {
            const isSelected = index === activeIndex;
            return (
              <div
                key={tab.id}
                id={`panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                aria-hidden={!isSelected}
                data-testid={`showcase-panel-${tab.id}`}
                data-index={index}
                data-active={isSelected ? 'true' : 'false'}
                className={`showcase-panel ${isSelected ? 'showcase-panel--active' : ''}`.trim()}
              >
                <figure className="showcase-figure">
                  {/* Strict 16:10 aspect ratio image container preventing CLS */}
                  <div
                    className="showcase-image-container"
                    data-testid={`showcase-image-container-${tab.id}`}
                    style={{ aspectRatio: '16 / 10' }}
                  >
                    <img
                      src={tab.image.src}
                      srcSet={tab.image.srcSet}
                      alt={tab.image.alt}
                      width={tab.image.width}
                      height={tab.image.height}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="showcase-image"
                      data-testid={`showcase-image-${tab.id}`}
                    />
                  </div>
                  {tab.caption && (
                    <figcaption
                      className="showcase-caption"
                      data-testid={`showcase-caption-${tab.id}`}
                    >
                      {tab.caption}
                    </figcaption>
                  )}
                </figure>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShowcaseGallery;
