import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, ExternalLink, ChevronRight, Sparkles, UserCheck, Shield, KeyRound, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, role, openAuthModal, logout, isAuthenticated } = useAuth();

  const getPageTitle = () => {
    if (location.pathname === '/citizen') return 'My Air Dashboard';
    if (location.pathname === '/explore') return 'Explore Air Quality';
    if (location.pathname === '/cleaner-routes') return 'Cleaner Routes';
    if (location.pathname === '/forecast-guidance') return 'Forecast & Activity Guidance';
    if (location.pathname === '/pollution-sources') return 'Pollution Sources';
    if (location.pathname === '/my-alerts') return 'My Alerts';
    if (location.pathname === '/report-pollution') return 'Report Pollution';
    if (location.pathname === '/my-places') return 'My Places & History';
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
          <span>{role === 'CITIZEN' ? 'USER PORTAL' : 'AUTHORITY DIGITAL TWIN'}</span>
          <ChevronRight size={12} />
          <span>
            {role === 'CITIZEN'
              ? location.pathname === '/my-places'
                ? 'MY PLACES & HISTORY'
                : location.pathname === '/report-pollution'
                ? 'REPORT POLLUTION'
                : location.pathname === '/my-alerts'
                ? 'MY ALERTS'
                : location.pathname === '/pollution-sources'
                ? 'POLLUTION SOURCES'
                : location.pathname === '/forecast-guidance'
                ? 'FORECAST & ACTIVITY GUIDANCE'
                : location.pathname === '/cleaner-routes'
                ? 'CLEANER ROUTES'
                : location.pathname === '/explore'
                ? 'EXPLORE AIR QUALITY'
                : 'MY AIR DASHBOARD'
              : 'ENVIRONMENTAL CONTROL ROOM'}
          </span>
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#eef1e7', margin: '0.2rem 0' }}>{getPageTitle()}</h1>
        <div className="navbar-period" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(238, 241, 231, 0.5)', fontSize: '0.78rem' }}>
          <Calendar size={12} />
          <span>Continuous Sensor Stream · Pune Metropolitan Region (PMC &amp; PCMC)</span>
        </div>
      </div>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Role & Persona Display: Interactive switcher for Authority, static badge for Citizen */}
        {role === 'AUTHORITY' ? (
          <button
            onClick={openAuthModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.95rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(207, 152, 97, 0.25) 0%, rgba(164, 109, 56, 0.15) 100%)',
              border: '1.5px solid #cf9861',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Switch between Citizen and Authority roles"
          >
            <Shield size={14} color="#f3c491" />
            <span>
              Authority Mode
              {user ? ` (${user.full_name.split(' ')[0]})` : ''}
            </span>
            <KeyRound size={12} style={{ opacity: 0.6, marginLeft: '4px' }} />
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.95rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(143, 160, 126, 0.25) 0%, rgba(68, 89, 62, 0.15) 100%)',
              border: '1.5px solid #8fa07e',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <UserCheck size={14} color="#a3b593" />
            <span>
              Citizen Mode
              {user ? ` (${user.full_name.split(' ')[0]})` : ''}
            </span>
          </div>
        )}

        {isAuthenticated && (
          <button
            onClick={logout}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              cursor: 'pointer',
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        )}

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
