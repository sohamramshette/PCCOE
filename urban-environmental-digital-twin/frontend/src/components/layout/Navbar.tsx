import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Calendar, ExternalLink, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'Urban Environmental Overview';
    if (location.pathname.startsWith('/stations')) {
      if (location.pathname === '/stations') return 'Continuous Air Quality Monitoring Stations';
      return 'Station Diagnostics & Spatial Exposures';
    }
    if (location.pathname === '/forecast') return 'Next-Hour PM2.5 Forecast';
    if (location.pathname === '/scenarios') return 'What-If Counterfactual Policy Simulator';
    if (location.pathname === '/digital-twin') return 'Pune Digital Twin';
    if (location.pathname === '/alerts') return 'Environmental Threshold Alerts & Events';
    if (location.pathname === '/backtracking') return 'Atmospheric Trajectory Backtracking Engine';
    if (location.pathname === '/model-performance') return 'MLOps Model Performance & Registry';
    if (location.pathname === '/data-methodology') return 'Data Governance & Methodology';
    return 'Urban Environmental Workspace';
  };

  const sectionLabel = location.pathname.startsWith('/stations')
    ? 'MONITORING NETWORK'
    : location.pathname === '/forecast' || location.pathname === '/scenarios' || location.pathname === '/model-performance'
      ? 'ANALYTICS'
      : location.pathname === '/data-methodology'
        ? 'DATA GOVERNANCE'
        : 'PUNE · PCMC';

  const defaultApiUrl = import.meta.env.PROD
    ? 'https://pccoe-75ji.onrender.com'
    : 'http://localhost:8000';

  const baseApiUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    defaultApiUrl
  ).replace(/\/+$/, '');
  const apiDocsUrl = `${baseApiUrl}/docs`;

  return (
    <header className="top-navbar">
      <div className="navbar-context">
        <div className="navbar-breadcrumb">
          <span>{sectionLabel}</span>
          <ChevronRight size={12} />
          <span>DIGITAL TWIN WORKSPACE</span>
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#eef1e7', margin: '0.2rem 0' }}>{getPageTitle()}</h1>
        <div className="navbar-period" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(238, 241, 231, 0.5)', fontSize: '0.78rem' }}>
          <Calendar size={12} />
          <span>Continuous Sensor Stream · Pune Metropolitan Region (PMC & PCMC)</span>
        </div>
      </div>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          to="/"
          className="btn btn-secondary"
          style={{
            padding: '0.55rem 0.95rem',
            fontSize: '0.8rem',
            gap: '0.4rem',
            background: 'rgba(143, 160, 126, 0.12)',
            borderColor: 'rgba(143, 160, 126, 0.28)',
            color: '#a3b593',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none'
          }}
          title="Return to 3D Living World Landing Page"
        >
          <Sparkles size={13} />
          <span>3D Twin View</span>
        </Link>

        <div className="provenance-status" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(143, 160, 126, 0.1)', border: '1px solid rgba(143, 160, 126, 0.22)', padding: '0.5rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', color: '#a3b593' }}>
          <ShieldCheck size={14} />
          <span>OpenAQ / CPCB Provenance</span>
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
