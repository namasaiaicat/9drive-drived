import React from 'react';
import type { Dictionary, FeatureCard } from '../types';
import '../styles/features.css';

export interface FeaturesProps {
  features: Dictionary['features'];
}

/**
 * Clean SVG Icon component for feature cards.
 */
function FeatureIcon({ name }: { name: string }) {
  switch (name) {
    case 'Layers':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      );
    case 'Database':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      );
    case 'Zap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'Network':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="16" y="16" width="6" height="6" rx="1" />
          <rect x="2" y="16" width="6" height="6" rx="1" />
          <rect x="9" y="2" width="6" height="6" rx="1" />
          <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
          <path d="M12 12V8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
}

/**
 * Architectural SVG diagram for each feature card.
 */
function ArchitecturalDiagram({ cardId, title }: { cardId: string; title: string }) {
  const label = `Architectural diagram for ${title}`;

  if (cardId === 'pooling') {
    return (
      <div className="feature-card-diagram" role="img" aria-label={label}>
        <svg viewBox="0 0 340 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 3 Source Account Nodes */}
          <rect x="6" y="8" width="94" height="28" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="53" y="26" fill="#c4c7c5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Drive A (15GB)</text>

          <rect x="123" y="8" width="94" height="28" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="170" y="26" fill="#c4c7c5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Drive B (15GB)</text>

          <rect x="240" y="8" width="94" height="28" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="287" y="26" fill="#c4c7c5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Drive C (15GB)</text>

          {/* Flow Arrows */}
          <path d="M53 36 L130 58" stroke="#a8c7fa" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M170 36 L170 58" stroke="#a8c7fa" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M287 36 L210 58" stroke="#a8c7fa" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Unified Virtual Storage Pool */}
          <rect x="70" y="58" width="200" height="30" rx="6" fill="#004a77" stroke="#a8c7fa" strokeWidth="1.2" />
          <text x="170" y="77" fill="#c2e7ff" fontSize="11" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">
            Unified Virtual Pool (45GB)
          </text>
        </svg>
      </div>
    );
  }

  if (cardId === 'local-first') {
    return (
      <div className="feature-card-diagram" role="img" aria-label={label}>
        <svg viewBox="0 0 340 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Client App */}
          <rect x="6" y="32" width="85" height="32" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="48" y="52" fill="#c4c7c5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Client App</text>

          {/* Bi-directional arrow */}
          <path d="M91 48 L114 48" stroke="#a8c7fa" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Local SQLite Cache */}
          <rect x="114" y="32" width="100" height="32" rx="6" fill="#282a2c" stroke="#a8c7fa" strokeWidth="1.2" />
          <text x="164" y="47" fill="#e3e3e3" fontSize="9.5" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">SQLite Catalog</text>
          <text x="164" y="58" fill="#a8c7fa" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Staging Cache</text>

          {/* Bi-directional arrow to Daemon */}
          <path d="M214 48 L237 48" stroke="#a8c7fa" strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Sync Daemon / Cloud */}
          <rect x="237" y="32" width="97" height="32" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="285" y="47" fill="#c4c7c5" fontSize="9.5" fontFamily="sans-serif" textAnchor="middle">Sync Daemon</text>
          <text x="285" y="58" fill="#8e918f" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Cloud Remote</text>
        </svg>
      </div>
    );
  }

  if (cardId === 'cdn-streaming') {
    return (
      <div className="feature-card-diagram" role="img" aria-label={label}>
        <svg viewBox="0 0 340 95" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Player */}
          <rect x="6" y="32" width="80" height="32" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="46" y="52" fill="#c4c7c5" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Media Player</text>

          {/* Arrow */}
          <path d="M86 48 L114 48" stroke="#a8c7fa" strokeWidth="1.5" />

          {/* Edge Range Proxy */}
          <rect x="114" y="24" width="112" height="48" rx="6" fill="#004a77" stroke="#a8c7fa" strokeWidth="1.2" />
          <text x="170" y="44" fill="#c2e7ff" fontSize="9.5" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">HTTP Range Proxy</text>
          <text x="170" y="58" fill="#a8c7fa" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Edge Chunk Cache</text>

          {/* Arrow */}
          <path d="M226 48 L254 48" stroke="#a8c7fa" strokeWidth="1.5" />

          {/* High throughput stream */}
          <rect x="254" y="32" width="80" height="32" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="294" y="47" fill="#c4c7c5" fontSize="9.5" fontFamily="sans-serif" textAnchor="middle">Drive Stream</text>
          <text x="294" y="58" fill="#a8c7fa" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Zero Rate-Limit</text>
        </svg>
      </div>
    );
  }

  // universal-gateway
  return (
    <div className="feature-card-diagram" role="img" aria-label={label}>
      <svg viewBox="0 0 340 95" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Client protocols */}
        <g>
          <rect x="6" y="10" width="80" height="20" rx="4" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="46" y="24" fill="#c4c7c5" fontSize="9" fontFamily="sans-serif" textAnchor="middle">S3 API</text>

          <rect x="6" y="37" width="80" height="20" rx="4" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="46" y="51" fill="#c4c7c5" fontSize="9" fontFamily="sans-serif" textAnchor="middle">WebDAV</text>

          <rect x="6" y="64" width="80" height="20" rx="4" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
          <text x="46" y="78" fill="#c4c7c5" fontSize="9" fontFamily="sans-serif" textAnchor="middle">REST Endpoint</text>
        </g>

        {/* Multiplexing paths */}
        <path d="M86 20 L126 47" stroke="#a8c7fa" strokeWidth="1.2" />
        <path d="M86 47 L126 47" stroke="#a8c7fa" strokeWidth="1.2" />
        <path d="M86 74 L126 47" stroke="#a8c7fa" strokeWidth="1.2" />

        {/* Gateway Adapter */}
        <rect x="126" y="26" width="108" height="42" rx="6" fill="#004a77" stroke="#a8c7fa" strokeWidth="1.2" />
        <text x="180" y="44" fill="#c2e7ff" fontSize="9.5" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">Universal Gateway</text>
        <text x="180" y="57" fill="#a8c7fa" fontSize="8" fontFamily="sans-serif" textAnchor="middle">Multi-Protocol Adapter</text>

        {/* To pooled drives */}
        <path d="M234 47 L258 47" stroke="#a8c7fa" strokeWidth="1.5" />

        <rect x="258" y="31" width="76" height="32" rx="6" fill="#1e1f20" stroke="#444746" strokeWidth="1" />
        <text x="296" y="51" fill="#c4c7c5" fontSize="9.5" fontFamily="sans-serif" textAnchor="middle">Pooled Drive</text>
      </svg>
    </div>
  );
}

/**
 * Core Features breakdown component rendering feature cards with titles,
 * functional summaries, technical access patterns, and architectural diagrams.
 */
export function Features({ features }: FeaturesProps) {
  return (
    <section id="features" className="features-section" aria-labelledby="features-heading">
      <div className="features-section-header">
        <h2 id="features-heading" className="features-section-title">
          {features.sectionTitle}
        </h2>
        <p className="features-section-subtitle">
          {features.sectionSubtitle}
        </p>
      </div>

      <div className="features-grid">
        {features.cards.map((card: FeatureCard) => (
          <article
            key={card.id}
            id={`feature-${card.id}`}
            className="feature-card"
            data-feature-id={card.id}
          >
            <div className="feature-card-header">
              <div className="feature-icon-wrapper" aria-hidden="true">
                <FeatureIcon name={card.iconName} />
              </div>
              <h3 className="feature-card-title">{card.title}</h3>
            </div>

            <p className="feature-card-summary">{card.summary}</p>

            <div className="feature-card-tech">
              <div className="feature-tech-header">
                <span className="feature-tech-badge">Technical Access Pattern</span>
              </div>
              <p className="feature-tech-detail">{card.technicalDetail}</p>
            </div>

            <ArchitecturalDiagram cardId={card.id} title={card.title} />
          </article>
        ))}
      </div>
    </section>
  );
}
