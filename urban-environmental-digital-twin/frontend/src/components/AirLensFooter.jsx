import React from 'react';

export default function AirLensFooter() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="airlens-footer">
      <div className="footer-container">
        <div className="footer-top-grid">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="footer-brand-title">
              <span className="footer-logo-dot"></span>
              AirLens
            </div>
            <p className="footer-tagline">
              Urban Environmental Digital Twin for Pune and Pimpri-Chinchwad. Connecting observational sensor telemetry, atmospheric dispersion models, and policy simulation.
            </p>
            <div className="footer-geo-coverage">
              <span className="cov-label">Metropolitan Boundary:</span>
              <span className="cov-val">Pune Municipal Corporation (PMC) & Pimpri Chinchwad Municipal Corporation (PCMC)</span>
            </div>
          </div>

          {/* Links Col 1: Platform */}
          <div className="footer-links-col">
            <span className="footer-col-heading">Platform</span>
            <ul className="footer-link-list">
              <li><button type="button" onClick={() => scrollTo('capabilities')}>Capabilities</button></li>
              <li><button type="button" onClick={() => scrollTo('how-it-works')}>How It Works</button></li>
              <li><button type="button" onClick={() => scrollTo('live-twin')}>Live Twin Grid</button></li>
              <li><button type="button" onClick={() => scrollTo('methodology')}>Methodology</button></li>
            </ul>
          </div>

          {/* Links Col 2: Provenance */}
          <div className="footer-links-col">
            <span className="footer-col-heading">Data Provenance</span>
            <ul className="footer-link-list">
              <li><span className="static-item">Central Pollution Control Board (CPCB)</span></li>
              <li><span className="static-item">SAFAR · Indian Institute of Tropical Meteorology</span></li>
              <li><span className="static-item">Maharashtra Pollution Control Board (MPCB)</span></li>
              <li><span className="static-item">India Meteorological Department (IMD Pune)</span></li>
              <li><span className="static-item">Copernicus Sentinel-5P TROPOMI Satellite</span></li>
            </ul>
          </div>

          {/* Links Col 3: Principles */}
          <div className="footer-links-col">
            <span className="footer-col-heading">Integrity</span>
            <ul className="footer-link-list">
              <li><span className="static-item">Sensor vs Model Separation</span></li>
              <li><span className="static-item">Explicit Uncertainty Limits</span></li>
              <li><span className="static-item">Zero Synthetic Imputation</span></li>
              <li><span className="static-item">Open Academic Methodology</span></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Strip */}
        <div className="footer-bottom-strip">
          <div className="bottom-left">
            <span>© {new Date().getFullYear()} AirLens. All rights reserved.</span>
            <span className="dot-sep">·</span>
            <span>Pune Urban Environmental Digital Twin</span>
          </div>
          <div className="bottom-right">
            <span className="live-status-chip">
              <span className="green-blink"></span>
              All 24 Regional Telemetry Feeds Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
