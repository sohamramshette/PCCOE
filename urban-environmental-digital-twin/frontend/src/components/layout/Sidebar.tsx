import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Activity,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Compass,
  Sparkles,
  Heart,
  Shield,
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
