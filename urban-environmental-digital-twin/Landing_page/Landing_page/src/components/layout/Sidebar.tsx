import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Layers,
  BarChart2,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Compass,
  Sparkles,
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';
import { AirLensLogo } from '../common/AirLensLogo';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
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

  const navGroups = [
    {
      label: 'MONITOR',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { to: '/stations', label: 'Stations', icon: <MapPin size={18} /> },
        { to: '/digital-twin', label: 'Pune Digital Twin', icon: <Layers size={18} /> },
        { to: '/alerts', label: 'Alerts & Events', icon: <AlertTriangle size={18} /> },
      ],
    },
    {
      label: 'ANALYZE',
      items: [
        { to: '/forecast', label: 'Next-Hour Forecast', icon: <TrendingUp size={18} /> },
        { to: '/scenarios', label: 'What-If Scenarios', icon: <SlidersHorizontal size={18} /> },
        { to: '/backtracking', label: 'Backtracking Engine', icon: <Compass size={18} /> },
        { to: '/model-performance', label: 'Model Performance', icon: <BarChart2 size={18} /> },
        { to: '/data-methodology', label: 'Data & Methodology', icon: <BookOpen size={18} /> },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="brand-title" aria-label="Return to AirLens Living World Landing Page" title="Return to 3D Living World">
          <div className="landing-brand-mark" aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>
            <AirLensLogo size={24} />
          </div>
          <div className="brand-copy">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, color: '#eef1e7' }}>AirLens</span>
              <span className="brand-badge-pill" style={{ background: 'rgba(143, 160, 126, 0.25)', color: '#a3b593', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                PUNE
              </span>
            </div>
            <div className="brand-subtitle" style={{ color: 'rgba(238, 241, 231, 0.5)', fontSize: '0.72rem' }}>
              Digital Twin System
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
          {navGroups.map((group) => (
            <React.Fragment key={group.label}>
              <li className="nav-group-label">{group.label}</li>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end={item.to === '/dashboard'}
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
            <div>Registered Models: {health.registered_models ?? 4}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
