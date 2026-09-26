import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Activity,
  Layers,
  BarChart2,
  BookOpen,
} from 'lucide-react';
import { getHealth } from '../../api/health';
import { HealthResponse } from '../../types/common';

export const Sidebar: React.FC = () => {
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

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/stations', label: 'Stations', icon: <MapPin size={18} /> },
    { to: '/digital-twin', label: 'Pune Digital Twin', icon: <Layers size={18} /> },
    { to: '/forecast', label: 'Next-Hour Forecast', icon: <TrendingUp size={18} /> },
    { to: '/scenarios', label: 'What-If Scenarios', icon: <SlidersHorizontal size={18} /> },
    { to: '/model-performance', label: 'Model Performance', icon: <BarChart2 size={18} /> },
    { to: '/data-methodology', label: 'Data & Methodology', icon: <BookOpen size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-title">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Urban Twin</span>
              <span className="brand-badge">PUNE</span>
            </div>
            <div className="brand-subtitle">Environmental Digital Twin</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                end={item.to === '/'}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
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
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.4 }}>
            <div>Active Stations: {health.active_stations ?? 6}</div>
            <div>Registered Models: {health.registered_models ?? 4}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
