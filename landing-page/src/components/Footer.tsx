import React from 'react';
import type { Dictionary } from '../types';

export interface FooterProps {
  /** Footer content dictionary */
  readonly footer: Dictionary['footer'];
}

/**
 * Footer component adhering to Material Design 3.
 * Renders copyright attribution, open-source MIT license notice,
 * and outbound links (docs, issue tracker, community discussions).
 */
export const Footer: React.FC<FooterProps> = ({ footer }) => {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-container">
        {/* Left Column: Brand, Copyright & License */}
        <div className="footer-brand-section">
          <div className="footer-brand">
            <span className="footer-logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,20 2,20" fill="var(--color-primary, #0b57d0)" />
              </svg>
            </span>
            <span className="footer-brand-title">9Drive</span>
          </div>
          <p className="footer-copyright">{footer.copyright}</p>
          <p className="footer-license">{footer.license}</p>
        </div>

        {/* Right Column: Outbound Navigation Links */}
        <nav className="footer-nav" aria-label="Footer Navigation">
          <ul className="footer-links-list">
            <li>
              <a
                href={footer.docsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                aria-label="Documentation (opens in a new tab)"
              >
                <span>Documentation</span>
                <svg
                  width="12"
                  height="12"
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
            <li>
              <a
                href={footer.issuesLink}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                aria-label="Issue Tracker (opens in a new tab)"
              >
                <span>Issues</span>
                <svg
                  width="12"
                  height="12"
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
            <li>
              <a
                href={footer.communityLink}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                aria-label="Community Discussions (opens in a new tab)"
              >
                <span>Community</span>
                <svg
                  width="12"
                  height="12"
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
      </div>
    </footer>
  );
};
