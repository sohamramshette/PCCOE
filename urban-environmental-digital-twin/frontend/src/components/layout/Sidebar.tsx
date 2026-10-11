import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Compass,
  Sparkles,
  Heart,
  Wind,
  Bell,
  Camera,
  Bookmark,
  Route,
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';
import { AirLensLogo } from '../common/AirLensLogo';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onSwitchToHorizontal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onSwitchToHorizontal }) => {
  const { role } = useAuth();
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

  // Citizen Navigation (Clean & Understandable)
  const citizenNav = [
    {
      label: 'USER PORTAL',
      items: [
        { to: '/citizen', label: 'My Air Dashboard', icon: <Heart size={18} /> },
        { to: '/explore', label: 'Explore Air Quality', icon: <MapPin size={18} /> },
        { to: '/cleaner-routes', label: 'Cleaner Routes', icon: <Route size={18} /> },
        { to: '/forecast-guidance', label: 'Forecast & Activity Guidance', icon: <TrendingUp size={18} /> },
        { to: '/pollution-sources', label: 'Pollution Sources', icon: <Wind size={18} /> },
        { to: '/my-alerts', label: 'My Alerts', icon: <Bell size={18} /> },
        { to: '/report-pollution', label: 'Report Pollution', icon: <Camera size={18} /> },
        { to: '/my-places', label: 'My Places & History', icon: <Bookmark size={18} /> },
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
      ],
    },
  ];

  const currentNav = role === 'CITIZEN' ? citizenNav : authorityNav;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="brand-title" aria-label="Return to AirLens Living World Landing Page" title="Return to 3D Living World">
          <div className="landing-brand-mark" aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>
            <AirLensLogo size={24} />
          </div>
          <div className="brand-copy">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>AirLens</span>
              <span className="brand-badge-pill" style={{ background: 'rgba(34, 197, 94, 0.22)', color: '#4ade80', fontSize: '0.65rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(74, 222, 128, 0.35)' }}>
                {role === 'AUTHORITY' ? 'AUTHORITY' : 'CITIZEN'}
              </span>
            </div>
            <div className="brand-subtitle" style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>
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
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              color: '#86efac',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            title="Return to 3D Living World Landing Page"
          >
            <Sparkles size={14} />
            {!collapsed && <span>3D Living World Home</span>}
          </Link>
          {onSwitchToHorizontal && (
            <button
              type="button"
              onClick={onSwitchToHorizontal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                marginTop: '0.4rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(96, 165, 250, 0.35)',
                color: '#93c5fd',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Shift vertical menu to horizontal stacking bar"
            >
              <SlidersHorizontal size={14} />
              {!collapsed && <span>Shift to Horizontal Bar</span>}
            </button>
          )}
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
          <span className="backend-label" style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
            <Layers size={13} color="#4ade80" />
            FastAPI Backend
          </span>
          <div
            className="health-status-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color:
                healthState === 'live'
                  ? '#4ade80'
                  : healthState === 'offline'
                  ? '#f87171'
                  : '#fbbf24',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
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
                ? 'Live Feed'
                : healthState === 'waking'
                ? 'Waking Server...'
                : healthState === 'offline'
                ? 'Offline'
                : 'Connecting...'}
            </span>
          </div>
        </div>

        {health && (
          <div className="backend-metrics" style={{ color: '#64748b', fontSize: '0.7rem', lineHeight: 1.45 }}>
            <div>Active Stations: {health.active_stations ?? 6}</div>
            <div>Auth RBAC: {role}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
