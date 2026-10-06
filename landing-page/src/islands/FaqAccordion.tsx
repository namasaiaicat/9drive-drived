import React, {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import type { FaqItem } from '../types';
import '../styles/faq.css';

/**
 * Pure state machine transition for single-expansion accordion.
 * Returns null if clicking the currently expanded item (toggle collapse).
 * Otherwise returns the newly targeted item ID (closing any prior item).
 */
export function toggleAccordionItem(
  currentExpandedId: string | null,
  targetId: string
): string | null {
  if (currentExpandedId === targetId) {
    return null;
  }
  return targetId;
}

/**
 * Calculates next accordion header index for W3C APG keyboard navigation.
 * Supports cyclic wrapping for ArrowDown/ArrowUp and boundary jumps for Home/End.
 */
export function getNextAccordionIndex(
  currentIndex: number,
  totalItems: number,
  key: string
): number {
  if (totalItems <= 0) return 0;
  switch (key) {
    case 'ArrowDown':
      return (currentIndex + 1) % totalItems;
    case 'ArrowUp':
      return (currentIndex - 1 + totalItems) % totalItems;
    case 'Home':
      return 0;
    case 'End':
      return totalItems - 1;
    default:
      return currentIndex;
  }
}

export interface FaqAccordionProps {
  readonly items: readonly FaqItem[];
  readonly initialExpandedId?: string | null;
  readonly headingLevel?: 'h2' | 'h3' | 'h4';
  readonly idPrefix?: string;
  readonly className?: string;
  readonly reducedMotionOverride?: boolean;
  readonly onToggle?: (expandedId: string | null) => void;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({
  items,
  initialExpandedId = null,
  headingLevel = 'h3',
  idPrefix = 'faq',
  className = '',
  reducedMotionOverride,
  onToggle,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleToggle = useCallback(
    (id: string) => {
      setExpandedId((prev) => {
        const next = toggleAccordionItem(prev, id);
        onToggle?.(next);
        return next;
      });
    },
    [onToggle]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number, itemId: string) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleToggle(itemId);
        return;
      }

      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const nextIndex = getNextAccordionIndex(index, items.length, e.key);
        buttonRefs.current[nextIndex]?.focus();
      }
    },
    [handleToggle, items.length]
  );

  const HeadingTag = headingLevel;

  return (
    <div
      className={`faq-accordion ${className}`.trim()}
      data-reduced-motion={
        reducedMotionOverride !== undefined ? String(reducedMotionOverride) : undefined
      }
    >
      {items.map((item, index) => {
        const isExpanded = expandedId === item.id;
        const buttonId = `${idPrefix}-btn-${item.id}`;
        const panelId = `${idPrefix}-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className={`faq-accordion-item ${isExpanded ? 'faq-accordion-item--expanded' : ''}`}
            data-item-id={item.id}
          >
            <HeadingTag className="faq-accordion-heading">
              <button
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                id={buttonId}
                type="button"
                className={`faq-accordion-button ${
                  isExpanded ? 'faq-accordion-button--expanded' : ''
                }`}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => handleToggle(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index, item.id)}
              >
                <span className="faq-accordion-question">{item.question}</span>
                <span
                  className={`faq-accordion-icon ${
                    isExpanded ? 'faq-accordion-icon--expanded' : ''
                  }`}
                  aria-hidden="true"
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
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
            </HeadingTag>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isExpanded}
              className={`faq-accordion-panel ${
                isExpanded ? 'faq-accordion-panel--expanded' : ''
              }`}
              data-expanded={isExpanded ? 'true' : 'false'}
            >
              <div className="faq-accordion-panel-content">
                <p className="faq-accordion-answer">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
