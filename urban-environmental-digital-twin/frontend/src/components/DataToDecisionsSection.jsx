import React, { useState } from 'react';
import CardSwap, { Card } from './CardSwap';
import FoldText from './FoldText';

const DECISION_STEPS = [
  {
    number: '01',
    title: 'Observe the city',
    summary: 'Inspect available monitoring-station readings, historical patterns, and data completeness without treating missing measurements as actual observations.',
    highlights: [
      'Uncompromised data integrity: null values remain explicitly flagged rather than interpolated blindly.',
      'Spatial granularity: Station-level temporal traces across all 24 continuous monitoring nodes in Pune.',
      'Hourly resolution with automated quality screening against physical instrument calibration bounds.'
    ],
    metricBadge: '24 Nodes · High Fidelity'
  },
  {
    number: '02',
    title: 'Understand changing conditions',
    summary: 'Compare air quality with relevant atmospheric context and examine model-generated forecasts alongside measured data.',
    highlights: [
      'Multi-layer correlation: Overlay wind drift vectors, boundary layer collapse, and vehicular traffic surges.',
      'Model vs Ground Truth juxtaposition: Instant visual audit of forecast deviation against actual observations.',
      'Diurnal cycle decomposition identifying recurring morning and evening emission accumulation.'
    ],
    metricBadge: 'Meteorology + Chemistry'
  },
  {
    number: '03',
    title: 'Explore possible interventions',
    summary: 'Investigate policy scenarios, compare modeled outcomes, and understand the assumptions behind each simulation before drawing conclusions.',
    highlights: [
      'Digital twin simulation: Re-route industrial transit, model electric vehicle penetration, test green buffer belts.',
      'Explicit hypothesis testing: Clear toggles for emission reduction factors and meteorological boundary limits.',
      'Granular neighborhood impact projections across PMC and PCMC administrative wards.'
    ],
    metricBadge: 'Scenario Physics Engine'
  },
  {
    number: '04',
    title: 'Support better decisions',
    summary: 'Bring observations, forecasts, and scenario analysis together to help identify areas for further investigation and environmental planning.',
    highlights: [
      'Evidence-backed municipal briefings for urban planners, environmental engineers, and public health officials.',
      'Actionable target zones: Prioritize high-exposure street canyons and vulnerable school/hospital buffer zones.',
      'Exportable audit trails for transparent regulatory compliance and citizen advisory updates.'
    ],
    metricBadge: 'Policy & Civic Action'
  }
];

export default function DataToDecisionsSection({ onOpenDashboard }) {
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | 'grid'

  return (
    <section className="airlens-section section-decisions" id="how-it-works">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-block">
          <span className="section-eyebrow">OBSERVE. UNDERSTAND. EXPLORE.</span>
          <h2 className="section-title">
            <FoldText
              text="Turn environmental evidence into informed action."
              splitBy="word"
              hinge="top"
              trigger="scroll"
              duration={0.65}
              stagger={0.045}
              ease="power3.out"
              perspective={700}
              creaseShading={0.45}
              fontSize="inherit"
              fontWeight="inherit"
              color="#ffffff"
            />
          </h2>
          <p className="section-lead">
            Moving from raw environmental signals to meaningful city interventions requires a rigorous, four-stage progressive pipeline.
          </p>
        </div>

        {/* View Mode Toggle Bar */}
        <div className="decisions-view-toggle-bar">
          <span className="step-indicator-label">EXPLORE THE 4-STAGE PIPELINE</span>
          <div className="decisions-toggle-group">
            <button
              type="button"
              className={`decisions-toggle-btn ${viewMode === '3d' ? 'is-active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 1.5l6 3.5-6 3.5-6-3.5 6-3.5zM2 8.5l6 3.5 6-3.5M2 12l6 3.5 6-3.5" />
              </svg>
              <span>3D Card Deck</span>
            </button>
            <button
              type="button"
              className={`decisions-toggle-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              <span>Timeline Grid</span>
            </button>
          </div>
        </div>

        {/* Conditional Rendering: 3D CardSwap View vs 4-Card Grid View */}
        {viewMode === '3d' ? (
          <div className="decisions-swap-showcase">
            {/* Left Column: Interactive Stages Overview */}
            <div className="decisions-swap-left">
              {DECISION_STEPS.map((step, idx) => (
                <div
                  key={step.number}
                  className={`decisions-pipeline-nav-item ${activeStep === idx ? 'is-active' : ''}`}
                  onClick={() => setActiveStep(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="pipeline-step-num">{step.number}</span>
                  <div className="pipeline-step-info">
                    <h4>{step.title}</h4>
                    <p>{step.summary}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: 3D Stack CardSwap Animation Deck */}
            <div className="decisions-swap-right" style={{ minHeight: '580px', position: 'relative' }}>
              <CardSwap
                cardDistance={56}
                verticalDistance={64}
                delay={5000}
                pauseOnHover={false}
                skewAmount={4}
                onCardChange={setActiveStep}
              >
                {DECISION_STEPS.map((step) => (
                  <Card key={step.number}>
                    <div className="step-card-header">
                      <span className="step-number-tag">{step.number}</span>
                      <span className="step-badge">{step.metricBadge}</span>
                    </div>

                    <h3 className="step-heading">{step.title}</h3>
                    <p className="step-summary">{step.summary}</p>

                    <ul className="step-bullet-list">
                      {step.highlights.map((item, hIdx) => (
                        <li key={hIdx} className="step-bullet-item">
                          <span className="bullet-dash" aria-hidden="true">—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="step-card-footer">
                      <span className="step-indicator-label">
                        STAGE {step.number} · {step.metricBadge}
                      </span>
                      <div className="step-arrow-circle is-active">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M4 8h8M8 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardSwap>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="decisions-timeline-layout">
            {DECISION_STEPS.map((step, idx) => (
              <div
                key={step.number}
                className={`decision-step-card ${activeStep === idx ? 'is-active' : ''}`}
                onClick={() => setActiveStep(idx)}
                role="button"
                tabIndex={0}
              >
                <div className="step-card-header">
                  <span className="step-number-tag">{step.number}</span>
                  <span className="step-badge">{step.metricBadge}</span>
                </div>

                <h3 className="step-heading">{step.title}</h3>
                <p className="step-summary">{step.summary}</p>

                {/* Step Bullet Details */}
                <ul className="step-bullet-list">
                  {step.highlights.map((item, hIdx) => (
                    <li key={hIdx} className="step-bullet-item">
                      <span className="bullet-dash" aria-hidden="true">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="step-card-footer">
                  <span className="step-indicator-label">
                    {activeStep === idx ? 'CURRENT FOCUS' : 'CLICK TO INSPECT'}
                  </span>
                  <div className={`step-arrow-circle ${activeStep === idx ? 'is-active' : ''}`}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 8h8M8 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="decisions-cta-wrap">
          <button
            type="button"
            className="btn-primary-muted-green"
            onClick={onOpenDashboard}
            id="btn-open-dashboard-decisions"
          >
            <span>Open the Dashboard</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

