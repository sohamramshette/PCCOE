import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SakuraPetals } from '../components/common/SakuraPetals';
import '../components/auth/AuthPages.css';

export const PortalSelection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page-root">
      <div className="auth-page-glow" />
      <SakuraPetals />

      {/* Top Bar with Back Link and AirLens Branding */}
      <header className="auth-topbar">
        <Link to="/" className="auth-back-link" aria-label="Return to landing page">
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>

        <div className="auth-brand-badge">
          <span className="pulse-dot" />
          <span>AirLens · Pune Twin</span>
        </div>
      </header>

      {/* Center Selection Stage */}
      <main className="auth-stage-container">
        <div className="auth-header-block">
          <span className="auth-eyebrow">Portal Selection</span>
          <h1 className="auth-title" style={{ color: '#ffffff' }}>Choose Your Portal</h1>
          <p className="auth-subtitle">
            Access Pune &amp; Pimpri-Chinchwad&apos;s urban environmental intelligence tailored to your role.
          </p>
        </div>

        {/* Two Clearly Separated Portal Options */}
        <div className="portal-selection-grid">
          {/* User Portal Option */}
          <div className="portal-card portal-card-user">
            <div>
              <div className="portal-card-header">
                <div className="portal-icon-box" aria-hidden="true">
                  <Heart size={26} />
                </div>
                <span className="portal-pill">Resident &amp; Public</span>
              </div>

              <div className="portal-card-body">
                <h2 className="portal-name" style={{ color: '#ffffff' }}>User Portal</h2>
                <p className="portal-desc">
                  Explore local air quality, pollution hotspots, forecasts, and cleaner routes.
                </p>

                <ul className="portal-features-list">
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>Hyperlocal PM2.5 neighborhood advisories</span>
                  </li>
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>Daily fitness, commute &amp; outdoor safety tips</span>
                  </li>
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>Real-time voice assistant guidance</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="btn-continue-portal btn-continue-user"
              onClick={() => navigate('/login/user')}
              aria-label="Continue to User Portal login"
            >
              <span>Continue as User</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Authority Portal Option */}
          <div className="portal-card portal-card-authority">
            <div>
              <div className="portal-card-header">
                <div className="portal-icon-box" aria-hidden="true">
                  <Shield size={26} />
                </div>
                <span className="portal-pill">Authority &amp; MLOps</span>
              </div>

              <div className="portal-card-body">
                <h2 className="portal-name" style={{ color: '#ffffff' }}>Authority Portal</h2>
                <p className="portal-desc">
                  Access citywide environmental monitoring and authority-specific tools.
                </p>

                <ul className="portal-features-list">
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>Continuous CAAQMN telemetry stream</span>
                  </li>
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>What-If counterfactual policy simulator</span>
                  </li>
                  <li className="portal-feature-item">
                    <CheckCircle2 size={15} className="portal-feature-bullet" />
                    <span>Atmospheric trajectory backtracking engine</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="btn-continue-portal btn-continue-authority"
              onClick={() => navigate('/login/authority')}
              aria-label="Continue to Authority Portal login"
            >
              <span>Continue as Authority</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalSelection;
