import React from 'react';

export default function CtaSection({ onEnterAirLens }) {
  return (
    <section className="airlens-section section-cta">
      <div className="section-container">
        <div className="cta-banner-card">
          {/* Subtle Ambient Radial Lighting Background */}
          <div className="cta-ambient-glow" aria-hidden="true"></div>

          <div className="cta-content-inner">
            <div className="cta-brand-tag">
              <span className="cta-leaf-dot"></span>
              AIRLENS · PUNE ENVIRONMENTAL TWIN
            </div>

            <h2 className="cta-main-title">
              A better understanding of the city starts with better evidence.
            </h2>

            <p className="cta-body-copy">
              Explore Pune's environmental data, investigate emerging patterns, and discover how a connected digital twin can support more informed urban environmental decisions.
            </p>

            <div className="cta-button-cluster">
              <button
                type="button"
                className="btn-primary-muted-green btn-cta-large"
                onClick={onEnterAirLens}
                id="btn-final-enter-airlens"
              >
                <span>Enter AirLens</span>
                <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Sub-badge indicators */}
            <div className="cta-guarantee-row">
              <div className="guarantee-pill">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>Public Environmental Data Transparency</span>
              </div>
              <div className="guarantee-pill">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>Full PMC & PCMC Urban Scope</span>
              </div>
              <div className="guarantee-pill">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>Zero Hallucination Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
