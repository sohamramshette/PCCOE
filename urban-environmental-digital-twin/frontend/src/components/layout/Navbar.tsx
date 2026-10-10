import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, ExternalLink, ChevronRight, Sparkles, UserCheck, Shield, KeyRound, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, role, openAuthModal, logout, isAuthenticated } = useAuth();

  const getPageTitle = () => {
    if (location.pathname === '/citizen') return 'Citizen Clean Air & Health Portal';
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
          <span>{role === 'CITIZEN' ? 'PUBLIC PORTAL' : 'AUTHORITY DIGITAL TWIN'}</span>
          <ChevronRight size={12} />
          <span>{role === 'CITIZEN' ? 'RESIDENT BRIEFING' : 'ENVIRONMENTAL CONTROL ROOM'}</span>
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0d1710', margin: '0.2rem 0' }}>{getPageTitle()}</h1>
        <div className="navbar-period" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.78rem' }}>
          <Calendar size={12} color="#166534" />
          <span>Continuous Sensor Stream · Pune Metropolitan Region (PMC &amp; PCMC)</span>
        </div>
      </div>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Role & Persona Switcher */}
        <button
          onClick={openAuthModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.55rem 0.95rem',
            borderRadius: '12px',
            background: role === 'AUTHORITY'
              ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
            border: `1.5px solid ${role === 'AUTHORITY' ? '#b45309' : '#166534'}`,
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: role === 'AUTHORITY' ? '0 2px 10px rgba(217, 119, 6, 0.25)' : '0 2px 10px rgba(22, 101, 52, 0.25)',
            transition: 'all 0.2s ease',
          }}
          title="Switch between Citizen and Authority roles"
        >
          {role === 'AUTHORITY' ? <Shield size={14} color="#fef08a" /> : <UserCheck size={14} color="#86efac" />}
          <span>
            {role === 'AUTHORITY' ? 'Authority Mode' : 'Citizen Mode'}
            {user ? ` (${user.full_name.split(' ')[0]})` : ''}
          </span>
          <KeyRound size={12} style={{ opacity: 0.8, marginLeft: '4px' }} />
        </button>

        {isAuthenticated && (
          <button
            onClick={logout}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
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
            background: '#ffffff',
            borderColor: '#287a45',
            color: '#166534',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(40, 122, 69, 0.08)',
          }}
          title="Return to 3D Living World Landing Page"
        >
          <Sparkles size={13} color="#287a45" />
          <span>3D Twin View</span>
        </Link>

        <a
          href={apiDocsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            padding: '0.55rem 0.95rem',
            fontSize: '0.8rem',
            gap: '0.4rem',
            background: '#ffffff',
            borderColor: 'rgba(40, 122, 69, 0.3)',
            color: '#166534',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(40, 122, 69, 0.08)',
          }}
          title="Open FastAPI Swagger Interactive Documentation"
        >
          <span>FastAPI Docs</span>
          <ExternalLink size={13} color="#166534" />
        </a>
      </div>
    </header>
  );
};
