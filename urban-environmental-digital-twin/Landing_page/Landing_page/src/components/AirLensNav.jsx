import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { scrollToCard } from '../utils/scrollHelper';

const NAV_MENUS = [
  { id: 'environmental-intelligence', label: 'Environmental Intelligence' },
  { id: 'live-monitoring-map', label: 'Live Monitoring Map' },
  { id: 'digital-twin-explorer', label: 'Digital Twin Explorer' },
  { id: 'data-transparency', label: 'Data Transparency' }
];

export default function AirLensNav({ onOpenDashboard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);

      // Determine active section in stack
      const sections = Array.from(document.querySelectorAll('.stack-card-section'));
      if (sections.length > 1) {
        const scrollY = window.scrollY;
        let cumulative = sections[0].offsetHeight;
        let current = '';
        for (let i = 1; i < sections.length; i++) {
          const sec = sections[i];
          const nextHeight = sec.offsetHeight;
          if (scrollY >= cumulative - 120 && scrollY < cumulative + nextHeight - 120) {
            current = sec.id;
            break;
          }
          cumulative += nextHeight;
        }
        setActiveSection(current);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (anchorId) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      scrollToCard(anchorId);
    } else {
      navigate('/', { state: { scrollTo: anchorId } });
    }
  };

  const handleBrandClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const allSections = document.querySelectorAll('.stack-card-section');
      allSections.forEach((s) => {
        s.style.visibility = 'visible';
      });
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate('/');
    }
  };

  const handleDashboardClick = () => {
    setMobileMenuOpen(false);
    if (onOpenDashboard) {
      onOpenDashboard();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className={`airlens-nav-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="airlens-nav" aria-label="Main Navigation">
        {/* Brand Left */}
        <div
          className="airlens-nav-brand"
          onClick={handleBrandClick}
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

        {/* Center Links - 4 Scrolling Card Menus */}
        <div className="airlens-nav-links">
          {NAV_MENUS.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <span className="nav-dot" aria-hidden="true">·</span>}
              <button
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`nav-link ${activeSection === item.id ? 'is-active' : ''}`}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Right Dashboard CTA */}
        <div className="airlens-nav-cta">
          <button
            type="button"
            className="btn-open-dashboard"
            onClick={handleDashboardClick}
            aria-label="Open Pune Environmental Dashboard"
          >
            <span>Open Dashboard</span>
            <svg className="arrow-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12L12 4M12 4H6M12 4V10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {NAV_MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`mobile-link ${activeSection === item.id ? 'is-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
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
