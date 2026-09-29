import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';

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
        { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
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
        { to: '/model-performance', label: 'Model Performance', icon: <BarChart2 size={18} /> },
        { to: '/data-methodology', label: 'Data & Methodology', icon: <BookOpen size={18} /> },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/welcome" className="brand-title" aria-label="Urban Twin Pune home">
          <span className="landing-brand-mark" aria-hidden="true">
            <Activity size={19} />
          </span>
          <div className="brand-copy">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Urban Twin</span>
              <span className="landing-brand-city">PUNE</span>
            </div>
            <div className="brand-subtitle">Environmental Digital Twin</div>
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

      <nav style={{ flex: 1 }}>
        <ul className="nav-list">
          {navGroups.map((group) => (
            <React.Fragment key={group.label}>
              <li className="nav-group-label">{group.label}</li>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end={item.to === '/'}
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
          <span className="backend-label" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={13} />
            FastAPI Backend
          </span>
          <div className="health-status-badge">
            <span
              className={`status-dot ${
                isHealthy === true ? 'healthy' : isHealthy === false ? 'unhealthy' : ''
              }`}
            />
            <span style={{ fontSize: '0.75rem' }}>
              {isHealthy === true ? 'Connected' : isHealthy === false ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>

        {health && (
          <div className="backend-metrics" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.4 }}>
            <div>Active Stations: {health.active_stations ?? 6}</div>
            <div>Registered Models: {health.registered_models ?? 4}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
