import React, { useState } from 'react';

const TRANSPARENCY_PILLARS = [
  {
    id: 'provenance',
    title: 'Data Provenance',
    subtitle: 'Strict sensor origin & hardware auditing',
    badge: 'AUDITED FEEDS',
    description: 'Every reading in AirLens records its exact originating instrumentation, agency validation tier (CPCB/MPCB/SAFAR), calibration curve timestamp, and data transmission latency. Users can trace any citywide anomaly back to the raw telemetry ping.',
    checklist: [
      'Certified Beta Attenuation & Optical Particle Monitor identification',
      'Automated flagging of sensor drift, telemetry dropouts, and maintenance outages',
      'Immutable ingestion timestamps preventing retrospective data distortion'
    ]
  },
  {
    id: 'assumptions',
    title: 'Explicit Assumptions',
    subtitle: 'Transparent physics & chemical models',
    badge: 'OPEN PARAMETERS',
    description: 'When model estimates or simulation scenarios are displayed, the underlying assumptions are documented in plain view: emission inventory baselines, spatial grid resolution (1 km²), atmospheric boundary conditions, and chemical reaction rates.',
    checklist: [
      'Documented vehicular, industrial, and fugitive dust emission factors',
      'Clearly demarcated WRF atmospheric boundary constraints',
      'Scenario models state boundary conditions before showing projected deltas'
    ]
  },
  {
    id: 'limitations',
    title: 'Transparent Limitations',
    subtitle: 'No false certainty in unmonitored zones',
    badge: 'UNCERTAINTY BOUNDS',
    description: 'AirLens never masks measurement gaps with ungrounded smoothing. Where physical monitoring is sparse, confidence intervals widen explicitly. We communicate what the data can and cannot conclude with complete scientific integrity.',
    checklist: [
      'Spatial interpolation carries explicit 95% error bands',
      'Zero synthetic hallucination of missing values during sensor offline windows',
      'Distinct visual encoding for empirical observations vs model estimates'
    ]
  }
];

export default function TransparencySection({ onExploreMethodology }) {
  const [activePillar, setActivePillar] = useState('provenance');

  return (
    <section className="airlens-section section-transparency" id="methodology">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-block">
          <span className="section-eyebrow">EVIDENCE BEFORE ASSUMPTIONS</span>
          <h2 className="section-title">Every insight should be traceable.</h2>
          <p className="section-lead">
            Environmental decisions require more than attractive visualizations. They require clarity about where the data comes from, how it is processed, and what it can—and cannot—tell us.
            <br className="section-lead-break" />
            AirLens distinguishes measured observations, external environmental datasets, forecasts, and simulated scenarios so users can interpret results with greater confidence.
          </p>
        </div>

        {/* 3 Provenance Badges Banner */}
        <div className="provenance-badges-banner">
          <div className="badge-item">
            <span className="badge-dot"></span>
            <span className="badge-text">Data provenance</span>
          </div>
          <span className="badge-sep">·</span>
          <div className="badge-item">
            <span className="badge-dot"></span>
            <span className="badge-text">Explicit assumptions</span>
          </div>
          <span className="badge-sep">·</span>
          <div className="badge-item">
            <span className="badge-dot"></span>
            <span className="badge-text">Transparent limitations</span>
          </div>
        </div>

        {/* Interactive Transparency Pillars Grid */}
        <div className="pillars-grid">
          {TRANSPARENCY_PILLARS.map((pillar) => (
            <div
              key={pillar.id}
              className={`pillar-card ${activePillar === pillar.id ? 'is-selected' : ''}`}
              onClick={() => setActivePillar(pillar.id)}
              role="button"
              tabIndex={0}
            >
              <div className="pillar-header">
                <span className="pillar-badge">{pillar.badge}</span>
                <h3 className="pillar-title">{pillar.title}</h3>
                <span className="pillar-subtitle">{pillar.subtitle}</span>
              </div>

              <p className="pillar-desc">{pillar.description}</p>

              <div className="pillar-checklist">
                {pillar.checklist.map((item, idx) => (
                  <div key={idx} className="check-row">
                    <svg className="check-bullet" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                      <circle cx="8" cy="8" r="7" stroke="rgba(143, 160, 126, 0.4)" />
                      <path d="M5 8.2l2 2 4-4" stroke="#8fa07e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Methodology CTA Wrap */}
        <div className="transparency-cta-wrap">
          <button
            type="button"
            className="btn-secondary-subtle"
            onClick={onExploreMethodology}
            id="btn-explore-methodology"
          >
            <span>Explore the Methodology</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
