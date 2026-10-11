import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SakuraPetals } from '../components/common/SakuraPetals';
import '../components/auth/AuthPages.css';

export const UserDemoLogin: React.FC = () => {
  const navigate = useNavigate();
  const { enterDemo, quickLogin } = useAuth();
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterDemo = async () => {
    setIsEntering(true);
    try {
      if (quickLogin) {
        await quickLogin('CITIZEN');
      } else if (enterDemo) {
        enterDemo('CITIZEN');
      }
    } catch {
      // Fallback ensured by enterDemo
      enterDemo('CITIZEN');
    } finally {
      navigate('/citizen');
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-page-glow" />
      <SakuraPetals />

      {/* Top Bar with Back Link */}
      <header className="auth-topbar">
        <Link to="/login" className="auth-back-link" aria-label="Return to portal selection">
          <ArrowLeft size={15} />
          <span>Back to Portals</span>
        </Link>

        <div className="auth-brand-badge">
          <span className="pulse-dot" />
          <span>AirLens · Citizen Portal</span>
        </div>
      </header>

      {/* Main Login Stage */}
      <main className="auth-stage-container">
        <div className="demo-login-card">
          <div className="demo-login-badge demo-badge-user">
            <span>Resident Access</span>
          </div>

          <div className="demo-login-icon-wrap demo-icon-wrap-user" aria-hidden="true">
            <Heart size={34} />
          </div>

          <h1 className="demo-login-heading">User Login</h1>
          <p className="demo-login-subtext">
            Enter the citizen air quality portal to view neighborhood PM2.5 levels, daily health advisories, and clean travel recommendations across Pune.
          </p>

          {/* Demo Persona Card */}
          <div className="demo-persona-preview">
            <div>
              <div className="persona-name">Rahul Sharma (Resident)</div>
              <div className="persona-role">Kothrud, Pune · Citizen Access</div>
            </div>
            <div className="persona-status-dot">Demo Ready</div>
          </div>

          {/* Only Single Required Action Button */}
          <button
            type="button"
            className="btn-enter-demo btn-enter-demo-user"
            onClick={handleEnterDemo}
            disabled={isEntering}
            aria-label="Enter Demo as User"
          >
            <span>{isEntering ? 'Opening Citizen Portal...' : 'Enter Demo as User'}</span>
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

export default UserDemoLogin;
