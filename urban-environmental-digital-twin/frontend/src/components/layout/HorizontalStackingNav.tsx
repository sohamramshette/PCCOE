import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Heart,
  Layers,
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  Sparkles,
  Wind,
  Bell,
  Camera,
  Bookmark,
  Maximize2,
  Minimize2,
  Sidebar as SidebarIcon,
} from 'lucide-react';
import { AirLensLogo } from '../common/AirLensLogo';

interface HorizontalStackingNavProps {
  onToggleSidebarMode?: () => void;
  isSidebarMode?: boolean;
}

export const HorizontalStackingNav: React.FC<HorizontalStackingNavProps> = ({
  onToggleSidebarMode,
  isSidebarMode: _isSidebarMode = false,
}) => {
  const location = useLocation();
  const { role } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);

  // Authority Nav items (from original vertical sidebar)
  const authorityNavItems = [
    { to: '/citizen', label: 'Citizen View', icon: <Heart size={15} /> },
    { to: '/digital-twin', label: 'Pune Digital Twin', icon: <Layers size={15} /> },
    { to: '/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={15} /> },
    { to: '/stations', label: 'Stations Network', icon: <MapPin size={15} /> },
    { to: '/alerts', label: 'Alerts & Events', icon: <AlertTriangle size={15} /> },
    { to: '/forecast', label: 'Next-Hour Forecast', icon: <TrendingUp size={15} /> },
    { to: '/scenarios', label: 'What-If Scenarios', icon: <SlidersHorizontal size={15} />, isTarget: true },
    { to: '/backtracking', label: 'Backtracking Engine', icon: <Compass size={15} /> },
  ];

  // Citizen Nav items
  const citizenNavItems = [
    { to: '/citizen', label: 'My Air Dashboard', icon: <Heart size={15} /> },
    { to: '/explore', label: 'Explore Air Quality', icon: <MapPin size={15} /> },
    { to: '/cleaner-routes', label: 'Cleaner Routes', icon: <Compass size={15} /> },
    { to: '/forecast-guidance', label: 'Forecast & Guidance', icon: <TrendingUp size={15} /> },
    { to: '/pollution-sources', label: 'Pollution Sources', icon: <Wind size={15} /> },
    { to: '/my-alerts', label: 'My Alerts', icon: <Bell size={15} /> },
    { to: '/report-pollution', label: 'Report Pollution', icon: <Camera size={15} /> },
    { to: '/my-places', label: 'My Places', icon: <Bookmark size={15} /> },
  ];

  const currentNav = role === 'CITIZEN' ? citizenNavItems : authorityNavItems;
  const isExpanded = forceExpanded || isHovered;

  return (
    <div
      className="horizontal-stacking-bar"
      style={{
        background: 'linear-gradient(135deg, rgba(11, 19, 14, 0.95) 0%, rgba(16, 28, 19, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(40, 122, 69, 0.28)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        padding: '0.65rem 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Brand & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: '#ffffff',
          }}
          title="Return to 3D Living World"
        >
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
            }}
            aria-hidden="true"
          >
            <AirLensLogo size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>AirLens</span>
              <span
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  border: '1px solid rgba(74, 222, 128, 0.35)',
                }}
              >
                HORIZONTAL BAR
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
              {role === 'AUTHORITY' ? 'Control Room Navigation' : 'Pune Air Guide'}
            </div>
          </div>
        </Link>

        <div
          style={{
            height: '28px',
            width: '1px',
            backgroundColor: 'rgba(40, 122, 69, 0.3)',
            margin: '0 0.25rem',
          }}
        />

        {/* 3D Living World Quick Home */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.25)',
            color: '#86efac',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          title="Return to 3D Living World"
        >
          <Sparkles size={12} />
          <span>Living World</span>
        </Link>
      </div>

      {/* Center: The Stacking Navbar Horizontal Menu */}
      <div
        className="stacking-nav-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          padding: '0.2rem 0',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {currentNav.map((item, index) => {
            const isActive = location.pathname === item.to;
            // The stacking effect calculation
            // When collapsed: offset by -90px for each index so they layer nicely
            // When expanded: 0 offset so they sit side by side
            const stackOffset = isExpanded ? 0 : -90 * index;

            return (
              <motion.div
                key={item.to}
                initial={{ x: -90 * index }}
                animate={{ x: stackOffset }}
                transition={{
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isExpanded ? 0.03 * index : 0.02 * (currentNav.length - index),
                  type: 'spring',
                  stiffness: 280,
                  damping: 24,
                }}
                style={{
                  zIndex: isActive ? 200 : 100 - index,
                  position: 'relative',
                }}
              >
                <Link
                  to={item.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    padding: '0.55rem 0.95rem',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.35) 0%, rgba(21, 128, 61, 0.45) 100%)'
                      : 'rgba(255, 255, 255, 0.07)',
                    color: isActive ? '#4ade80' : '#e2e8f0',
                    border: isActive
                      ? '1.5px solid rgba(74, 222, 128, 0.65)'
                      : '1px solid rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: isActive
                      ? '0 0 16px rgba(34, 197, 94, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25)'
                      : '0 4px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: isActive ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#4ade80',
                        boxShadow: '0 0 6px #4ade80',
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Controls: Expand toggle + Sidebar mode switch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setForceExpanded(!forceExpanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.7rem',
            borderRadius: '8px',
            background: forceExpanded ? 'rgba(34, 197, 94, 0.22)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${forceExpanded ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
            color: forceExpanded ? '#4ade80' : '#94a3b8',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={forceExpanded ? 'Collapse into stacked cards' : 'Keep all menu items expanded'}
        >
          {forceExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{forceExpanded ? 'Stacked Mode' : 'Expand All'}</span>
        </button>

        {onToggleSidebarMode && (
          <button
            type="button"
            onClick={onToggleSidebarMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.7rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Toggle between Horizontal Menu and Vertical Sidebar"
          >
            <SidebarIcon size={13} />
            <span>Vertical Sidebar</span>
          </button>
        )}
      </div>
    </div>
  );
};
