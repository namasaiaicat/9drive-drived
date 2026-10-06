import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Dictionary, Locale } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

export interface MobileDrawerProps {
  /** Navigation labels and strings from dictionary.nav */
  readonly nav: Dictionary['nav'];
  /** Active locale for language switcher */
  readonly currentLocale: Locale;
  /** GitHub repository URL */
  readonly githubUrl?: string;
  /** Custom trigger button ID */
  readonly triggerId?: string;
  /** Custom drawer container ID */
  readonly drawerId?: string;
  /** Controlled open state (optional) */
  readonly isOpen?: boolean;
  /** Callback fired when open state changes */
  readonly onOpenChange?: (isOpen: boolean) => void;
}

export const DEFAULT_TRIGGER_ID = 'mobile-nav-hamburger';
export const DEFAULT_DRAWER_ID = 'mobile-nav-drawer';

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Helper to query all focusable elements inside a container.
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return elements.filter((el) => {
    return !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1';
  });
}

/**
 * Pure keyboard handler implementing W3C Modal Dialog focus trapping.
 * Wraps Tab from last to first, and Shift+Tab from first to last element.
 */
export function handleFocusTrapKeyDown(
  container: HTMLElement | null,
  event: KeyboardEvent
): void {
  if (event.key !== 'Tab') return;

  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

  if (event.shiftKey) {
    if (!active || active === first || !container?.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (!active || active === last || !container?.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Locks document.body scroll by setting overflow: hidden and returns
 * an unlock callback that restores the previous overflow value.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined' || !document.body) {
    return () => {};
  }
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  return () => {
    document.body.style.overflow = prevOverflow;
  };
}

/**
 * MobileDrawer Island:
 * - Controlled/uncontrolled mobile slide-over navigation drawer.
 * - Opened via accessible hamburger button (aria-expanded, aria-controls).
 * - Focus trapping according to W3C Dialog (Modal) pattern.
 * - Backdrop dismissal, Escape key listener, and link-click auto-close.
 * - Locks document.body scroll while opened and returns focus to trigger on close.
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  nav,
  currentLocale,
  githubUrl = 'https://github.com/ninedrive/9drive',
  triggerId = DEFAULT_TRIGGER_ID,
  drawerId = DEFAULT_DRAWER_ID,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledIsOpen, onOpenChange]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleToggle = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  // Handle body scroll locking and focus management on open/close
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      wasOpenRef.current = true;
      const unlock = lockBodyScroll();

      // Move focus into the drawer upon opening (focus close button or first focusable)
      const timeoutId = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (drawerRef.current) {
          const focusables = getFocusableElements(drawerRef.current);
          if (focusables.length > 0) {
            focusables[0].focus();
          }
        }
      }, 30);

      // Keyboard listeners for Escape dismissal and Tab focus trapping
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        } else if (e.key === 'Tab') {
          handleFocusTrapKeyDown(drawerRef.current, e);
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timeoutId);
        unlock();
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else if (wasOpenRef.current) {
      // Returned focus to hamburger button when closed
      triggerRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [isOpen, handleClose]);

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="navbar-hamburger"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        aria-label={isOpen ? nav.menuCloseAria : nav.menuOpenAria}
        onClick={handleToggle}
      >
        <span className="hamburger-box" aria-hidden="true">
          <span className={`hamburger-inner ${isOpen ? 'is-active' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="mobile-drawer-wrapper">
          <div
            className="drawer-backdrop"
            onClick={handleClose}
            aria-hidden="true"
            data-testid="drawer-backdrop"
          />

          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={nav.menuOpenAria}
            className="drawer-panel"
            data-testid="drawer-panel"
          >
            <div className="drawer-header">
              <div className="drawer-brand">
                <span className="drawer-brand-logo" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <polygon points="12,2 22,20 2,20" fill="var(--color-primary, #0b57d0)" />
                  </svg>
                </span>
                <span className="drawer-brand-title">9Drive</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="drawer-close-btn"
                aria-label={nav.menuCloseAria}
                onClick={handleClose}
                data-testid="drawer-close-btn"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="drawer-nav" aria-label="Mobile Navigation">
              <ul className="drawer-nav-list">
                <li>
                  <a href="#showcase" className="drawer-nav-link" onClick={handleClose}>
                    {nav.showcase}
                  </a>
                </li>
                <li>
                  <a href="#features" className="drawer-nav-link" onClick={handleClose}>
                    {nav.features}
                  </a>
                </li>
                <li>
                  <a href="#install" className="drawer-nav-link" onClick={handleClose}>
                    {nav.install}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="drawer-nav-link" onClick={handleClose}>
                    {nav.faq}
                  </a>
                </li>
                <li>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drawer-nav-link external"
                    onClick={handleClose}
                  >
                    <span>{nav.github}</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </li>
              </ul>
            </nav>

            <div className="drawer-footer">
              <div className="drawer-controls">
                <LanguageSelector currentLocale={currentLocale} ariaLabel={nav.languageToggleAria} />
                <ThemeToggle ariaLabel={nav.themeToggleAria} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
