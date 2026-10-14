import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';
import { scrollToCard } from '../utils/scrollHelper';

const NAV_MENUS = [
  { id: 'environmental-intelligence', label: 'Environmental Intelligence' },
  { id: 'live-monitoring-map', label: 'Live Monitoring Map' },
  { id: 'digital-twin-explorer', label: 'Digital Twin Explorer' },
  { id: 'data-transparency', label: 'Data Transparency' }
];

export default function AirLensNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('.stack-card-section'));
    let sectionRanges = [];
    let frameId = 0;
    let previousScrolled = false;
    let previousSection = '';

    const measureSections = () => {
      let cumulativeHeight = sections[0]?.offsetHeight ?? 0;
      sectionRanges = sections.slice(1).map((section) => {
        const sectionHeight = section.offsetHeight;
        const range = {
          id: section.id,
          start: cumulativeHeight - 120,
          end: cumulativeHeight + sectionHeight - 120,
        };
        cumulativeHeight += sectionHeight;
        return range;
      });
    };

    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const nextScrolled = window.scrollY > 30;
        if (nextScrolled !== previousScrolled) {
          previousScrolled = nextScrolled;
          setScrolled(nextScrolled);
        }

        const scrollY = window.scrollY;
        const currentSection = sectionRanges.find(
          (range) => scrollY >= range.start && scrollY < range.end,
        )?.id ?? '';
        if (currentSection !== previousSection) {
          previousSection = currentSection;
          setActiveSection(currentSection);
        }
      });
    };

    measureSections();
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measureSections, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measureSections);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
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

        {/* Right Nav CTA: Login Button */}
        <div className="airlens-nav-cta">
          <button
            type="button"
            className="btn-nav-login"
            onClick={handleLoginClick}
            aria-label="Login to AirLens Portal"
          >
            <LogIn size={14} style={{ marginRight: '6px' }} />
            <span>Login</span>
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
        </div>
      )}
    </header>
  );
}
