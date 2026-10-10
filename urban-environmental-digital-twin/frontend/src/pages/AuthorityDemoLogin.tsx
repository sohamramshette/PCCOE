import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../components/auth/AuthPages.css';

export const AuthorityDemoLogin: React.FC = () => {
  const navigate = useNavigate();
  const { enterDemo, quickLogin } = useAuth();
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterDemo = async () => {
    setIsEntering(true);
    try {
      if (quickLogin) {
        await quickLogin('AUTHORITY');
      } else if (enterDemo) {
        enterDemo('AUTHORITY');
      }
    } catch {
      // Fallback ensured by enterDemo
      enterDemo('AUTHORITY');
    } finally {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-page-glow" />

      {/* Top Bar with Back Link */}
      <header className="auth-topbar">
        <Link to="/login" className="auth-back-link" aria-label="Return to portal selection">
          <ArrowLeft size={15} />
          <span>Back to Portals</span>
        </Link>

        <div className="auth-brand-badge">
          <span className="pulse-dot" />
          <span>AirLens · Authority Control Room</span>
        </div>
      </header>

      {/* Main Login Stage */}
      <main className="auth-stage-container">
        <div className="demo-login-card">
          <div className="demo-login-badge demo-badge-authority">
            <span>Regulatory &amp; Engineering</span>
          </div>

          <div className="demo-login-icon-wrap demo-icon-wrap-authority" aria-hidden="true">
            <Shield size={34} />
          </div>

          <h1 className="demo-login-heading">Authority Login</h1>
          <p className="demo-login-subtext">
            Access the high-resolution digital twin control room, continuous sensor telemetry, What-If policy simulations, and trajectory backtracking.
          </p>

          {/* Demo Persona Card */}
          <div className="demo-persona-preview">
            <div>
              <div className="persona-name">Dr. Sunita Kulkarni</div>
              <div className="persona-role">PCMC Environmental Protection Cell · Officer</div>
            </div>
            <div className="persona-status-dot">Demo Ready</div>
          </div>

          {/* Only Single Required Action Button */}
          <button
            type="button"
            className="btn-enter-demo btn-enter-demo-authority"
            onClick={handleEnterDemo}
            disabled={isEntering}
            aria-label="Enter Demo as Authority"
          >
            <span>{isEntering ? 'Opening Control Room...' : 'Enter Demo as Authority'}</span>
            <ArrowRight size={18} />
          </button>

          <div className="demo-login-footer-hint">
            Instant evaluation access. No credentials or registration required.
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthorityDemoLogin;
