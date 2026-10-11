import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Scene from '../Scene';
import InteractiveButterfly from './InteractiveButterfly';
import FoldText from './FoldText';
import { getHealth } from '../api/health';

export default function HeroSection({ onExploreTwin, onDiscoverApproach }) {
  const navigate = useNavigate();
  const [butterflyFlying, setButterflyFlying] = useState(false);
  const [activeStationsCount, setActiveStationsCount] = useState(6);

  useEffect(() => {
    let isCurrent = true;
    getHealth()
      .then((health) => {
        if (isCurrent && health?.active_stations) {
          setActiveStationsCount(health.active_stations);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  const triggerButterflyFlight = () => {
    setButterflyFlying(true);
    setTimeout(() => {
      setButterflyFlying(false);
    }, 6500);
  };

  const handleExploreClick = () => {
    if (onExploreTwin) {
      onExploreTwin();
    } else {
      navigate('/digital-twin');
    }
  };

  return (
    <section className="airlens-hero" id="hero">
      {/* 3D Living World Scene Background (Sylva living-green Three.js runtime) */}
      <div className="hero-scene-canvas-container" aria-hidden="true">
        <Scene />
        <div className="hero-atmosphere-vignette"></div>
      </div>

      {/* Hero Foreground Content */}
      <div className="hero-content-stage">
        {/* Eyebrow Label */}
        <div className="hero-eyebrow-container">
          <span className="hero-eyebrow-chip">
            <span className="eyebrow-indicator-pulse"></span>
            PUNE · URBAN ENVIRONMENTAL DIGITAL TWIN
          </span>
        </div>

        {/* Main Heading: 3 lines, elegant typography in warm white */}
        <h1
          className={`hero-title interactive-heading ${butterflyFlying ? 'is-flying-active' : ''}`}
          onClick={triggerButterflyFlight}
          title="Tap anywhere on the heading to make the butterfly fly!"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              triggerButterflyFlight();
            }
          }}
        >
          <span className="hero-title-line" style={{ color: '#ffffff' }}>
            <FoldText
              text="See the city."
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.65}
              stagger={0.035}
              ease="power3.out"
              perspective={700}
              creaseShading={0.45}
              fontSize="inherit"
              fontWeight="inherit"
              color="#ffffff"
            />
            <span className="butterfly-perch-anchor" aria-hidden="true">
              <InteractiveButterfly
                onTriggerFlight={triggerButterflyFlight}
                isExternalFlying={butterflyFlying}
              />
            </span>
          </span>
          <span className="hero-title-line" style={{ color: '#ffffff' }}>
            <FoldText
              text="Understand the air."
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.65}
              stagger={0.035}
              ease="power3.out"
              perspective={700}
              creaseShading={0.45}
              fontSize="inherit"
              fontWeight="inherit"
              color="#ffffff"
            />
          </span>
          <span className="hero-title-line highlight-phrase" style={{ color: '#ffffff' }}>
            <FoldText
              text="Shape what comes next."
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.7}
              stagger={0.035}
              ease="power3.out"
              perspective={700}
              creaseShading={0.45}
              fontSize="inherit"
              fontWeight="inherit"
              color="#ffffff"
            />
          </span>
        </h1>

        {/* Hero Short Description */}
        <p className="hero-lead-text">
          AirLens transforms Pune &amp; PCMC into a living digital twin, unifying environmental intelligence to reveal pollution patterns and predict urban risks. From real-time insights to simulated policies, we turn environmental data into smarter decisions for cleaner cities.
        </p>

        {/* Buttons */}
        <div className="hero-action-cluster">
          <button
            type="button"
            className="btn-primary-muted-green"
            onClick={handleExploreClick}
            id="btn-hero-explore"
          >
            <span>Explore the Digital Twin</span>
            <svg className="btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Scope and Telemetry Footer Strip */}
        <div className="hero-scope-ribbon">
          <div className="ribbon-geo">
            <div className="geo-icon" aria-hidden="true">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.4)" />
                <path d="M9 2a7 7 0 0 1 7 7c0 4.5-7 9-7 9s-7-4.5-7-9a7 7 0 0 1 7-7z" stroke="#a3b593" fill="rgba(163, 181, 147, 0.2)" />
                <circle cx="9" cy="8" r="2" fill="#eef1e7" />
              </svg>
            </div>
            <div className="geo-text">
              <span className="geo-title">PUNE & PIMPRI-CHINCHWAD</span>
              <span className="geo-subtitle">Continuous In-Situ Telemetry · ECMWF ERA5 Reanalysis · ML Forecasting</span>
            </div>
          </div>

          <div className="ribbon-telemetry">
            <div className="telemetry-item">
              <span className="telemetry-value">{activeStationsCount}</span>
              <span className="telemetry-label">Active Monitoring Stations</span>
            </div>
            <div className="telemetry-divider">/</div>
            <div className="telemetry-item">
              <span className="telemetry-value">1 km²</span>
              <span className="telemetry-label">Model Spatial Grid</span>
            </div>
            <div className="telemetry-divider">/</div>
            <div className="telemetry-item">
              <span className="telemetry-value">72 h</span>
              <span className="telemetry-label">Predictive Horizon</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
