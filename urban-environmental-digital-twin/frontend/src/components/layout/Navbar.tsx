import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Urban Environmental Overview';
    if (location.pathname.startsWith('/stations')) {
      if (location.pathname === '/stations') return 'Continuous Air Quality Monitoring Stations';
      return 'Station Profile & Diagnostics';
    }
    if (location.pathname === '/forecast') return 'Next-Hour PM2.5 Forecast';
    if (location.pathname === '/scenarios') return 'What-If Counterfactual Policy Simulator';
    if (location.pathname === '/digital-twin') return 'Pune Digital Twin';
    if (location.pathname === '/model-performance') return 'Model Performance';
    if (location.pathname === '/data-methodology') return 'Data & Methodology';
    return 'Urban Environmental Workspace';
  };

  const sectionLabel = location.pathname.startsWith('/stations')
    ? 'MONITORING NETWORK'
    : location.pathname === '/forecast' || location.pathname === '/scenarios' || location.pathname === '/model-performance'
      ? 'ANALYTICS'
      : location.pathname === '/data-methodology'
        ? 'DATA GOVERNANCE'
        : 'PUNE · PCMC';

  const apiDocsUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/docs`;

  return (
    <header className="top-navbar">
      <div className="navbar-context">
        <div className="navbar-breadcrumb"><span>{sectionLabel}</span><ChevronRight size={12} /><span>WORKSPACE</span></div>
        <h1>{getPageTitle()}</h1>
        <div className="navbar-period">
          <Calendar size={12} />
          <span>Historical window · Feb 18, 2025 — Sep 24, 2026</span>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="provenance-status">
          <ShieldCheck size={14} />
          <span>Provenance verified</span>
        </div>

        <a
          href={apiDocsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', gap: '0.4rem' }}
          title="Open FastAPI Swagger Interactive Documentation"
        >
          <span>FastAPI Docs</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </header>
  );
};
