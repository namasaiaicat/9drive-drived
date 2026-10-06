import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Dictionary, PlatformConfig, PlatformId, CommandSnippet } from '../types';
import { detectPlatform, DEFAULT_PLATFORM, type NavigatorLike } from '../utils/platform-detect';
import {
  safeSessionStorageGet,
  safeSessionStorageSet,
  PLATFORM_STORAGE_KEY,
} from '../utils/storage';
import '../styles/quickstart.css';

export const COPY_RESET_TIMEOUT_MS = 2000;

export interface QuickstartSnippetsProps {
  quickstart: Dictionary['quickstart'];
  initialPlatform?: PlatformId;
}

/**
 * Resolves the initial platform based on sessionStorage preference,
 * client OS auto-detection, and supported platforms.
 */
export function resolveInitialPlatform(
  platforms: readonly PlatformConfig[],
  initialPlatform?: PlatformId,
  customNav?: NavigatorLike
): PlatformId {
  const validIds = new Set(platforms.map((p) => p.id));

  // 1. SessionStorage preference overrides auto-detection
  const storedPref = safeSessionStorageGet(PLATFORM_STORAGE_KEY);
  if (storedPref && validIds.has(storedPref as PlatformId)) {
    return storedPref as PlatformId;
  }

  // 2. Explicit prop if provided and valid
  if (initialPlatform && validIds.has(initialPlatform)) {
    return initialPlatform;
  }

  // 3. Auto-detect OS via User Agent / UserAgentData
  const detected = detectPlatform(customNav);
  if (validIds.has(detected)) {
    return detected;
  }

  return validIds.has(DEFAULT_PLATFORM)
    ? DEFAULT_PLATFORM
    : (platforms[0]?.id ?? DEFAULT_PLATFORM);
}

/**
 * Safe clipboard copy handler. Returns true on success, false if denied or unsupported.
 */
export async function copyToClipboard(
  text: string,
  customClipboard?: { writeText: (text: string) => Promise<void> }
): Promise<boolean> {
  const clipboard =
    customClipboard ??
    (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);

  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard write permission denied, restricted context, or user aborted.
    return false;
  }
}

/**
 * Platform SVG icons.
 */
function PlatformIcon({ platformId }: { platformId: PlatformId }) {
  switch (platformId) {
    case 'macos':
      return (
        <svg className="quickstart-tab-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 3.53c.63-.76 1.05-1.82.93-2.88-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.74-.95 2.78 1.02.08 2.06-.51 2.69-1.27Z" />
        </svg>
      );
    case 'linux':
      return (
        <svg className="quickstart-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4 17 6-6-6-6" />
          <path d="M12 19h8" />
        </svg>
      );
    case 'windows':
      return (
        <svg className="quickstart-tab-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 5.45 10.45 4.4v7.05H3V5.45ZM3 18.55l7.45 1.05v-7.05H3v6ZM11.55 4.25 21 3v8.45h-9.45V4.25ZM11.55 19.75 21 21v-8.45h-9.45v7.2Z" />
        </svg>
      );
    case 'nodejs':
      return (
        <svg className="quickstart-tab-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2 3.5 6.9v9.8L12 21.6l8.5-4.9V6.9L12 2Zm0 2.3 6.5 3.8v7.5L12 19.3 5.5 15.6V8.1L12 4.3Z" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Copy button icon (Document or Checkmark).
 */
function CopyIcon({ isCopied }: { isCopied: boolean }) {
  if (isCopied) {
    return (
      <svg className="quickstart-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg className="quickstart-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/**
 * QuickstartSnippets React island component with client OS auto-detection,
 * iPadOS disambiguation, tab selection persistence in sessionStorage, and
 * visual copy confirmation with 2000ms reversion timeout.
 */
export function QuickstartSnippets({ quickstart, initialPlatform }: QuickstartSnippetsProps) {
  const { platforms, setupSteps, sectionTitle, sectionSubtitle, copiedNotification, copyButtonAria } = quickstart;

  // Active platform state
  const [activePlatform, setActivePlatform] = useState<PlatformId>(() =>
    resolveInitialPlatform(platforms, initialPlatform)
  );

  // Copied command tracking and timeout ref
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  // Synchronize on client mount with actual sessionStorage / navigator
  useEffect(() => {
    const resolved = resolveInitialPlatform(platforms, initialPlatform);
    setActivePlatform(resolved);
  }, [platforms, initialPlatform]);

  // Clean up any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Handle tab switch and persist in sessionStorage
  const handleSelectTab = useCallback((platformId: PlatformId) => {
    setActivePlatform(platformId);
    safeSessionStorageSet(PLATFORM_STORAGE_KEY, platformId);
  }, []);

  // Keyboard navigation for WAI-ARIA tabs (ArrowLeft, ArrowRight, Home, End)
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % platforms.length;
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + platforms.length) % platforms.length;
        event.preventDefault();
      } else if (event.key === 'Home') {
        nextIndex = 0;
        event.preventDefault();
      } else if (event.key === 'End') {
        nextIndex = platforms.length - 1;
        event.preventDefault();
      }

      if (nextIndex !== currentIndex) {
        const nextPlatform = platforms[nextIndex];
        if (nextPlatform) {
          handleSelectTab(nextPlatform.id);
          const tabBtn = document.getElementById(`quickstart-tab-${nextPlatform.id}`);
          tabBtn?.focus();
        }
      }
    },
    [platforms, handleSelectTab]
  );

  // Handle copy with visual confirmation & 2000ms reversion timeout
  const handleCopy = useCallback(
    async (snippetKey: string, commandText: string) => {
      const success = await copyToClipboard(commandText);
      if (!success) {
        // If clipboard access is denied, snippet text selection remains unobstructed
        return;
      }

      // Reset any existing timeout
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }

      setCopiedKey(snippetKey);

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
        copyTimeoutRef.current = null;
      }, COPY_RESET_TIMEOUT_MS);
    },
    []
  );

  return (
    <section id="install" className="quickstart-section" aria-labelledby="quickstart-heading">
      <div className="quickstart-header">
        <h2 id="quickstart-heading" className="quickstart-title">
          {sectionTitle}
        </h2>
        <p className="quickstart-subtitle">
          {sectionSubtitle}
        </p>
      </div>

      <div className="quickstart-container">
        {/* Setup steps overview */}
        {setupSteps && setupSteps.length > 0 && (
          <ol className="quickstart-steps" aria-label="Quickstart setup steps">
            {setupSteps.map((step: string, index: number) => (
              <li key={index} className="quickstart-step-item">
                <span className="quickstart-step-number">{index + 1}</span>
                <span className="quickstart-step-text">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Platform tabs */}
        <div className="quickstart-tabs-wrapper">
          <div
            role="tablist"
            aria-label="Operating system quickstart tabs"
            className="quickstart-tablist"
          >
            {platforms.map((platform: PlatformConfig, index: number) => {
              const isSelected = platform.id === activePlatform;
              return (
                <button
                  key={platform.id}
                  role="tab"
                  id={`quickstart-tab-${platform.id}`}
                  aria-selected={isSelected}
                  aria-controls={`quickstart-panel-${platform.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  className="quickstart-tab"
                  onClick={() => handleSelectTab(platform.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                >
                  <PlatformIcon platformId={platform.id} />
                  <span>{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab panels */}
        {platforms.map((platform: PlatformConfig) => {
          const isSelected = platform.id === activePlatform;
          return (
            <div
              key={platform.id}
              role="tabpanel"
              id={`quickstart-panel-${platform.id}`}
              aria-labelledby={`quickstart-tab-${platform.id}`}
              hidden={!isSelected}
              className="quickstart-panel"
            >
              {platform.snippets.map((snippet: CommandSnippet, sIdx: number) => {
                const snippetKey = `${platform.id}-${sIdx}`;
                const isCopied = copiedKey === snippetKey;

                return (
                  <div key={snippetKey} className="quickstart-snippet-card">
                    <div className="quickstart-snippet-header">
                      <span className="quickstart-snippet-label">{snippet.label}</span>
                    </div>
                    <div className="quickstart-snippet-body">
                      <pre className="quickstart-code-block">
                        <code>{snippet.command}</code>
                      </pre>
                      <button
                        type="button"
                        aria-label={`${copyButtonAria}: ${snippet.command}`}
                        className={`quickstart-copy-btn ${isCopied ? 'quickstart-copy-btn--copied' : ''}`}
                        onClick={() => handleCopy(snippetKey, snippet.command)}
                      >
                        <CopyIcon isCopied={isCopied} />
                        <span>{isCopied ? copiedNotification : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Screen reader live region for copy confirmation */}
      <div className="quickstart-sr-status" role="status" aria-live="polite">
        {copiedKey ? copiedNotification : ''}
      </div>
    </section>
  );
}
