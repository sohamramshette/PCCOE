import React, { useEffect, useState } from 'react';
import { useLocation, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  ChevronRight,
  UserCheck,
  Shield,
  KeyRound,
  LogOut,
  Heart,
  Layers,
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  Wind,
  Bell,
  Camera,
  Bookmark,
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';
import { AirLensLogo } from '../common/AirLensLogo';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, role, openAuthModal, logout, isAuthenticated } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthState, setHealthState] = useState<'connecting' | 'waking' | 'live' | 'offline'>('connecting');

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthState(data.status === 'ok' && data.database === 'connected' ? 'live' : 'offline');
          retryCount = 0;
          timer = setTimeout(checkHealth, 30000);
        }
      } catch {
        if (isMounted) {
          retryCount++;
          if (retryCount <= 4) {
            setHealthState('waking');
            // Render cold start can take ~45-60s, retry quickly every 7s
            timer = setTimeout(checkHealth, 7000);
          } else {
            setHealthState('offline');
            timer = setTimeout(checkHealth, 30000);
          }
        }
      }
    };

    checkHealth();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

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

  // Citizen Navigation Links
  const citizenNavItems = [
    { to: '/citizen', label: 'My Air Dashboard', icon: <Heart size={15} /> },
    { to: '/explore', label: 'Explore Air Quality', icon: <MapPin size={15} /> },
    { to: '/cleaner-routes', label: 'Cleaner Routes', icon: <Compass size={15} /> },
    { to: '/forecast-guidance', label: 'Forecast & Guidance', icon: <TrendingUp size={15} /> },
    { to: '/pollution-sources', label: 'Pollution Sources', icon: <Wind size={15} /> },
    { to: '/my-alerts', label: 'My Alerts', icon: <Bell size={15} /> },
    { to: '/report-pollution', label: 'Report Pollution', icon: <Camera size={15} /> },
    { to: '/my-places', label: 'My Places & History', icon: <Bookmark size={15} /> },
  ];

  // Authority Navigation Links (Monitor + Authority Analytics)
  const authorityMonitorItems = [
    { to: '/citizen', label: 'Citizen View', icon: <Heart size={15} /> },
    { to: '/digital-twin', label: 'Pune Digital Twin', icon: <Layers size={15} /> },
    { to: '/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={15} /> },
    { to: '/stations', label: 'Stations Network', icon: <MapPin size={15} /> },
    { to: '/alerts', label: 'Alerts & Events', icon: <AlertTriangle size={15} /> },
  ];

  const authorityAnalyticsItems = [
    { to: '/forecast', label: 'Next-Hour Forecast', icon: <TrendingUp size={15} /> },
    { to: '/scenarios', label: 'What-If Scenarios', icon: <SlidersHorizontal size={15} /> },
    { to: '/backtracking', label: 'Backtracking Engine', icon: <Compass size={15} /> },
  ];
  return (
    <header
      className="top-unified-navbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(40, 122, 69, 0.16)',
        boxShadow: '0 4px 24px rgba(22, 38, 25, 0.05)',
      }}
    >
      {/* 1. Main Header Row: Brand Logo, Breadcrumb, Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 2rem 0.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
            title="Return to 3D Living World"
          >
            <AirLensLogo size={20} withBackground={true} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    letterSpacing: '-0.02em',
                    color: '#0d1710',
                  }}
                >
                  AirLens
                </span>
                <span
                  style={{
                    background: role === 'AUTHORITY' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    color: role === 'AUTHORITY' ? '#b45309' : '#166534',
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    border: `1px solid ${role === 'AUTHORITY' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  }}
                >
                  {role === 'AUTHORITY' ? 'AUTHORITY' : 'CITIZEN'}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500 }}>
                {role === 'AUTHORITY' ? 'Control Room Navigation' : 'Pune Air Guide'}
              </div>
            </div>
          </Link>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* FastAPI Backend Live Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              background:
                healthState === 'live'
                  ? 'rgba(34, 197, 94, 0.08)'
                  : healthState === 'offline'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${
                healthState === 'live'
                  ? 'rgba(34, 197, 94, 0.25)'
                  : healthState === 'offline'
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(245, 158, 11, 0.25)'
              }`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color:
                healthState === 'live'
                  ? '#166534'
                  : healthState === 'offline'
                  ? '#b91c1c'
                  : '#d97706',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background:
                  healthState === 'live'
                    ? '#22c55e'
                    : healthState === 'offline'
                    ? '#ef4444'
                    : '#f59e0b',
                boxShadow:
                  healthState === 'live'
                    ? '0 0 8px #22c55e'
                    : healthState === 'waking' || healthState === 'connecting'
                    ? '0 0 6px #f59e0b'
                    : 'none',
              }}
            />
            <span>
              {healthState === 'live'
                ? 'FastAPI Live'
                : healthState === 'waking'
                ? 'Waking Server...'
                : healthState === 'offline'
                ? 'Backend Offline'
                : 'Connecting...'}
            </span>
            {health?.active_stations && healthState === 'live' && (
              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                ({health.active_stations} stns)
              </span>
            )}
          </div>

          {/* Role & Persona Switcher */}
          <button
            onClick={openAuthModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1rem',
              borderRadius: '9999px',
              background: role === 'AUTHORITY'
                ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
              border: `1.5px solid ${role === 'AUTHORITY' ? '#b45309' : '#166534'}`,
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: role === 'AUTHORITY' ? '0 2px 10px rgba(217, 119, 6, 0.25)' : '0 2px 10px rgba(22, 101, 52, 0.25)',
              transition: 'all 0.2s ease',
            }}
            title="Switch between Citizen and Authority roles"
          >
            {role === 'AUTHORITY' ? <Shield size={13} color="#fef08a" /> : <UserCheck size={13} color="#86efac" />}
            <span>
              {role === 'AUTHORITY' ? 'Authority Mode (Dr.)' : 'Citizen Mode'}
              {user ? ` (${user.full_name.split(' ')[0]})` : ''}
            </span>
            <KeyRound size={11} style={{ opacity: 0.8, marginLeft: '3px' }} />
          </button>

          {/* Sign out button */}
          {isAuthenticated && (
            <button
              onClick={logout}
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '9999px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Horizontal Nav Bar with Proper Padding & Rounding */}
      <div
        style={{
          padding: '0.35rem 2rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <nav
          className="horizontal-nav-pill-track"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.55rem',
            background: 'rgba(240, 246, 241, 0.9)',
            border: '1px solid rgba(40, 122, 69, 0.2)',
            borderRadius: '9999px',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
            minWidth: 'min-content',
          }}
        >
          {role === 'CITIZEN' ? (
            /* Citizen Nav Items */
            citizenNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    background: isActive
                      ? 'linear-gradient(135deg, #166534 0%, #15803d 100%)'
                      : 'transparent',
                    color: isActive ? '#ffffff' : '#334155',
                    border: isActive
                      ? '1.5px solid #22c55e'
                      : '1px solid transparent',
                    boxShadow: isActive
                      ? '0 3px 12px rgba(22, 101, 52, 0.28)'
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.color = '#166534';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#334155';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? '#ffffff' : '#166534' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })
          ) : (
            /* Authority Nav Items (Monitor + Divider + Analytics) */
            <>
              {authorityMonitorItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      background: isActive
                        ? 'linear-gradient(135deg, #166534 0%, #15803d 100%)'
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#334155',
                      border: isActive
                        ? '1.5px solid #22c55e'
                        : '1px solid transparent',
                      boxShadow: isActive
                        ? '0 3px 12px rgba(22, 101, 52, 0.28)'
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#166534';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#334155';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? '#ffffff' : '#166534' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* Group Divider */}
              <div
                style={{
                  height: '22px',
                  width: '1px',
                  backgroundColor: 'rgba(40, 122, 69, 0.25)',
                  margin: '0 0.35rem',
                }}
              />

              {authorityAnalyticsItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      background: isActive
                        ? 'linear-gradient(135deg, #166534 0%, #15803d 100%)'
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#334155',
                      border: isActive
                        ? '1.5px solid #22c55e'
                        : '1px solid transparent',
                      boxShadow: isActive
                        ? '0 3px 12px rgba(22, 101, 52, 0.28)'
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#166534';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#334155';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: isActive ? '#ffffff' : '#166534' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* 3. Page Context & Subtitle Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 2rem 0.65rem',
          borderTop: '1px solid rgba(40, 122, 69, 0.08)',
          background: 'rgba(255, 255, 255, 0.6)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#166534',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              marginBottom: '0.15rem',
            }}
          >
            <span>{role === 'CITIZEN' ? 'USER PORTAL' : 'AUTHORITY DIGITAL TWIN'}</span>
            <ChevronRight size={11} />
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
                  ? 'FORECAST & GUIDANCE'
                  : location.pathname === '/cleaner-routes'
                  ? 'CLEANER ROUTES'
                  : location.pathname === '/explore'
                  ? 'EXPLORE AIR QUALITY'
                  : 'MY AIR DASHBOARD'
                : 'ENVIRONMENTAL CONTROL ROOM'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d1710', margin: 0 }}>
            {getPageTitle()}
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#64748b',
            fontSize: '0.74rem',
          }}
        >
          <Calendar size={12} color="#166534" />
          <span>Continuous Sensor Stream · Pune Metropolitan Region (PMC &amp; PCMC)</span>
        </div>
      </div>
    </header>
  );
};
