import os

# 1. Update App.jsx
APP_JSX_CODE = '''import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { CitizenPortal } from './pages/CitizenPortal';
import { Dashboard } from './pages/Dashboard';
import { Stations } from './pages/Stations';
import { StationDetails } from './pages/StationDetails';
import { Forecast } from './pages/Forecast';
import { Scenarios } from './pages/Scenarios';
import { DigitalTwinMap } from './pages/DigitalTwinMap';
import { ModelPerformance } from './pages/ModelPerformance';
import { DataMethodology } from './pages/DataMethodology';
import { Alerts } from './pages/Alerts';
import { LandingPage } from './pages/LandingPage';
import { Scene } from './Scene';

const Backtracking = lazy(() => import('./pages/Backtracking').then((m) => ({ default: m.Backtracking })));

export { Scene };

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Master AirLens 3D Living World Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />

          {/* Dedicated Urban Environmental Digital Twin Workspace Pages */}
          <Route element={<Layout />}>
            {/* Clean Citizen Portal */}
            <Route path="citizen" element={<CitizenPortal />} />

            {/* Authority & Engineering Control Room */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stations" element={<Stations />} />
            <Route path="stations/:stationId" element={<StationDetails />} />
            <Route path="digital-twin" element={<DigitalTwinMap />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route
              path="backtracking"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Atmospheric Trajectory Backtracking Engine..." />}>
                  <Backtracking />
                </Suspense>
              }
            />
            <Route path="model-performance" element={<ModelPerformance />} />
            <Route path="data-methodology" element={<DataMethodology />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
'''

# 2. Update Layout.tsx (to render AuthModal)
LAYOUT_TSX_CODE = '''import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AuthModal } from '../auth/AuthModal';

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Subtle ambient background orbs */}
      <div className="ambient-orb ambient-orb--blue" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--orange" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--blue-soft" aria-hidden="true" />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} />
      <div className="main-wrapper">
        <Navbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      {/* Global Role & Authentication Modal */}
      <AuthModal />
    </div>
  );
};
'''

# 3. Update Navbar.tsx (with role badge & switch modal button)
NAVBAR_TSX_CODE = '''import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, ExternalLink, ShieldCheck, ChevronRight, Sparkles, UserCheck, Shield, KeyRound, LogOut } from 'lucide-react';

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
  ).replace(/\\/+$/, '');
  const apiDocsUrl = `${baseApiUrl}/docs`;

  return (
    <header className="top-navbar">
      <div className="navbar-context">
        <div className="navbar-breadcrumb">
          <span>{role === 'CITIZEN' ? 'PUBLIC PORTAL' : 'AUTHORITY DIGITAL TWIN'}</span>
          <ChevronRight size={12} />
          <span>{role === 'CITIZEN' ? 'RESIDENT BRIEFING' : 'ENVIRONMENTAL CONTROL ROOM'}</span>
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#eef1e7', margin: '0.2rem 0' }}>{getPageTitle()}</h1>
        <div className="navbar-period" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(238, 241, 231, 0.5)', fontSize: '0.78rem' }}>
          <Calendar size={12} />
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
              ? 'linear-gradient(135deg, rgba(207, 152, 97, 0.25) 0%, rgba(164, 109, 56, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(143, 160, 126, 0.25) 0%, rgba(68, 89, 62, 0.15) 100%)',
            border: `1.5px solid ${role === 'AUTHORITY' ? '#cf9861' : '#8fa07e'}`,
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Switch between Citizen and Authority roles"
        >
          {role === 'AUTHORITY' ? <Shield size={14} color="#f3c491" /> : <UserCheck size={14} color="#a3b593" />}
          <span>
            {role === 'AUTHORITY' ? 'Authority Mode' : 'Citizen Mode'}
            {user ? ` (${user.full_name.split(' ')[0]})` : ''}
          </span>
          <KeyRound size={12} style={{ opacity: 0.6, marginLeft: '4px' }} />
        </button>

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
'''

# 4. Update Sidebar.tsx (with role-based navigation filtering)
SIDEBAR_TSX_CODE = '''import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Activity,
  Layers,
  BarChart2,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Compass,
  Sparkles,
  Heart,
  Shield,
  KeyRound,
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { role, openAuthModal } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (isMounted) {
          setHealth(data);
          setIsHealthy(data.status === 'ok' && data.database === 'connected');
        }
      } catch {
        if (isMounted) {
          setIsHealthy(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Citizen Navigation (Clean & Understandable)
  const citizenNav = [
    {
      label: 'PUBLIC CITIZEN VIEW',
      items: [
        { to: '/citizen', label: 'Air Quality Today', icon: <Heart size={18} /> },
        { to: '/digital-twin', label: 'Pune Live Map', icon: <Layers size={18} /> },
        { to: '/alerts', label: 'Health Alerts', icon: <AlertTriangle size={18} /> },
      ],
    },
  ];

  // Authority Navigation (Complete Digital Twin Control Room)
  const authorityNav = [
    {
      label: 'MONITOR',
      items: [
        { to: '/citizen', label: 'Citizen View', icon: <Heart size={18} /> },
        { to: '/digital-twin', label: 'Pune Digital Twin', icon: <Layers size={18} /> },
        { to: '/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={18} /> },
        { to: '/stations', label: 'Stations Network', icon: <MapPin size={18} /> },
        { to: '/alerts', label: 'Alerts & Events', icon: <AlertTriangle size={18} /> },
      ],
    },
    {
      label: 'AUTHORITY ANALYTICS',
      items: [
        { to: '/forecast', label: 'Next-Hour Forecast', icon: <TrendingUp size={18} /> },
        { to: '/scenarios', label: 'What-If Scenarios', icon: <SlidersHorizontal size={18} /> },
        { to: '/backtracking', label: 'Backtracking Engine', icon: <Compass size={18} /> },
        { to: '/model-performance', label: 'Model Performance', icon: <BarChart2 size={18} /> },
        { to: '/data-methodology', label: 'Data & Methodology', icon: <BookOpen size={18} /> },
      ],
    },
  ];

  const currentNav = role === 'CITIZEN' ? citizenNav : authorityNav;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="brand-title" aria-label="Return to AirLens Living World Landing Page" title="Return to 3D Living World">
          <div className="landing-brand-mark" aria-hidden="true" style={{ background: 'rgba(143, 160, 126, 0.2)', color: '#a3b593', padding: '6px', borderRadius: '10px' }}>
            <Activity size={18} />
          </div>
          <div className="brand-copy">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, color: '#eef1e7' }}>AirLens</span>
              <span className="brand-badge-pill" style={{ background: 'rgba(143, 160, 126, 0.25)', color: '#a3b593', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                {role === 'AUTHORITY' ? 'AUTHORITY' : 'CITIZEN'}
              </span>
            </div>
            <div className="brand-subtitle" style={{ color: 'rgba(238, 241, 231, 0.5)', fontSize: '0.72rem' }}>
              {role === 'AUTHORITY' ? 'Control Room' : 'Pune Air Guide'}
            </div>
          </div>
        </Link>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {/* Quick return button */}
        <div style={{ padding: '0.75rem 0.75rem 0.25rem' }}>
          <Link
            to="/"
            className="btn-return-home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.75rem',
              borderRadius: '10px',
              background: 'rgba(143, 160, 126, 0.12)',
              border: '1px solid rgba(143, 160, 126, 0.22)',
              color: '#a3b593',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            title="Return to 3D Living World Landing Page"
          >
            <Sparkles size={14} />
            {!collapsed && <span>3D Living World Home</span>}
          </Link>
        </div>

        <ul className="nav-list">
          {currentNav.map((group) => (
            <React.Fragment key={group.label}>
              <li className="nav-group-label">{group.label}</li>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end={item.to === '/citizen' || item.to === '/dashboard'}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-active-mark" aria-hidden="true" />
                  </NavLink>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>

        {/* If Citizen, display Authority Upgrade Card in sidebar */}
        {role === 'CITIZEN' && !collapsed && (
          <div
            style={{
              margin: '1.25rem 0.75rem',
              padding: '1rem',
              borderRadius: '14px',
              background: 'rgba(207, 152, 97, 0.12)',
              border: '1px solid rgba(207, 152, 97, 0.25)',
              color: '#f3c491',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>
              <Shield size={14} color="#cf9861" />
              <span>Authority Control Room</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#d2b48c', lineHeight: 1.4 }}>
              Are you an environmental officer? Access policy simulations &amp; backtracking.
            </p>
            <button
              onClick={openAuthModal}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                borderRadius: '8px',
                background: '#cf9861',
                border: 'none',
                color: '#131812',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Switch Role / Sign In →
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <span className="backend-label" style={{ color: 'rgba(238, 241, 231, 0.55)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={13} />
            FastAPI Backend
          </span>
          <div className="health-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: isHealthy ? '#a3b593' : '#cf9861' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isHealthy === true ? '#8fa07e' : isHealthy === false ? '#cf6651' : '#cf9861',
                boxShadow: isHealthy === true ? '0 0 8px #8fa07e' : 'none',
              }}
            />
            <span>
              {isHealthy === true ? 'Live Feed' : isHealthy === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>
        </div>

        {health && (
          <div className="backend-metrics" style={{ color: 'rgba(238, 241, 231, 0.45)', fontSize: '0.7rem', lineHeight: 1.45 }}>
            <div>Active Stations: {health.active_stations ?? 6}</div>
            <div>Auth RBAC: {role}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
'''

for base_dir in [r"C:\Users\A1\Desktop\Landing_page", r"c:\Users\A1\Desktop\PCCOE-1\urban-environmental-digital-twin\frontend"]:
    # 1. App.jsx
    with open(os.path.join(base_dir, "src", "App.jsx"), "w", encoding="utf-8") as f:
        f.write(APP_JSX_CODE)
    
    # 2. Layout.tsx
    layout_dir = os.path.join(base_dir, "src", "components", "layout")
    with open(os.path.join(layout_dir, "Layout.tsx"), "w", encoding="utf-8") as f:
        f.write(LAYOUT_TSX_CODE)

    # 3. Navbar.tsx
    with open(os.path.join(layout_dir, "Navbar.tsx"), "w", encoding="utf-8") as f:
        f.write(NAVBAR_TSX_CODE)

    # 4. Sidebar.tsx
    with open(os.path.join(layout_dir, "Sidebar.tsx"), "w", encoding="utf-8") as f:
        f.write(SIDEBAR_TSX_CODE)

    print("Successfully updated App.jsx, Layout.tsx, Navbar.tsx, Sidebar.tsx in", base_dir)
