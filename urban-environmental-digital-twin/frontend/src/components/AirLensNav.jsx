import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ArrowUpRight, Menu, X } from 'lucide-react';

export default function AirLensNav({ onOpenDashboard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (targetPath, anchorId) => {
    setMobileMenuOpen(false);
    if (targetPath === '/dashboard') {
      navigate('/dashboard');
      return;
    }
    if (anchorId && location.pathname === '/') {
      const element = document.getElementById(anchorId);
      if (element) {
        if (window.__lenis) {
          window.__lenis.scrollTo(element, { duration: 1.2, offset: 0 });
        } else {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    }
    navigate(targetPath);
  };

  const handleDashboardClick = () => {
    setMobileMenuOpen(false);
    navigate('/dashboard');
  };

  const handleLoginClick = () => {
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className={`airlens-nav-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="airlens-nav" aria-label="Main Navigation">
        {/* Brand Left */}
        <div
          className="airlens-nav-brand"
          onClick={() => {
            if (location.pathname === '/') {
              if (window.__lenis) {
                window.__lenis.scrollTo(0, { duration: 1.2 });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            } else {
              navigate('/');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 3" />
              <circle cx="12" cy="12" r="5" stroke="#a3b593" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="rgba(255,255,255,0.6)" strokeLinecap="round" />
            </svg>
          </div>
          <div className="brand-text-block">
            <span className="brand-name">AirLens</span>
            <span className="brand-badge">
              <span className="pulse-dot"></span>
              PUNE TWIN
            </span>
          </div>
        </div>

        {/* Center Links */}
        <div className="airlens-nav-links">
          <button type="button" onClick={() => handleNavClick('/dashboard')} className="nav-link">
            Dashboard
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/digital-twin', 'live-twin')} className="nav-link">
            Digital Twin Map
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/stations', null)} className="nav-link">
            Stations
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/forecast', null)} className="nav-link">
            Forecast
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/scenarios', null)} className="nav-link">
            Scenarios
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/backtracking', null)} className="nav-link">
            Backtracking
          </button>
          <span className="nav-dot" aria-hidden="true">·</span>
          <button type="button" onClick={() => handleNavClick('/data-methodology', 'methodology')} className="nav-link">
            Methodology
          </button>
        </div>

        {/* Right Dashboard CTA */}
        <div className="airlens-nav-cta">
          <button
            type="button"
            className="btn-nav-login"
            onClick={handleLoginClick}
            aria-label="Login to AirLens Portal"
          >
            <LogIn size={13} style={{ marginRight: '4px' }} />
            <span>Login</span>
          </button>

          <button
            type="button"
            className="btn-open-dashboard"
            onClick={handleDashboardClick}
            aria-label="Open Pune Environmental Dashboard"
          >
            <span>Open Dashboard</span>
            <ArrowUpRight size={14} className="arrow-icon" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={18} />
            ) : (
              <Menu size={18} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <button
            type="button"
            className="mobile-login-btn"
            onClick={handleLoginClick}
          >
            Login to Portals →
          </button>
          <button type="button" onClick={() => handleNavClick('/dashboard')} className="mobile-link">
            Dashboard
          </button>
          <button type="button" onClick={() => handleNavClick('/digital-twin')} className="mobile-link">
            Digital Twin Map
          </button>
          <button type="button" onClick={() => handleNavClick('/stations')} className="mobile-link">
            Stations Profile
          </button>
          <button type="button" onClick={() => handleNavClick('/forecast')} className="mobile-link">
            Next-Hour Forecast
          </button>
          <button type="button" onClick={() => handleNavClick('/scenarios')} className="mobile-link">
            What-If Scenarios
          </button>
          <button type="button" onClick={() => handleNavClick('/backtracking')} className="mobile-link">
            Atmospheric Backtracking
          </button>
          <button type="button" onClick={() => handleNavClick('/data-methodology')} className="mobile-link">
            Data & Methodology
          </button>
          <button
            type="button"
            className="mobile-cta-btn"
            onClick={handleDashboardClick}
          >
            Launch Full Dashboard →
          </button>
        </div>
      )}
    </header>
  );
}
