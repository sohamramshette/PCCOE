import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Play,
  Table,
  Layers,
  Activity,
  Trees,
  Zap,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export interface ScenariosFeatureStackingNavProps {
  activeTab: 'optimizer' | 'single_scenario';
  onTabChange: (tab: 'optimizer' | 'single_scenario') => void;
  onSelectPreset?: (preset: 'pune_action_plan' | 'ev_transition' | 'green_buffer' | 'winter_emergency') => void;
  onScrollToTable?: (tableId: string) => void;
}

export const ScenariosFeatureStackingNav: React.FC<ScenariosFeatureStackingNavProps> = ({
  activeTab,
  onTabChange,
  onSelectPreset,
  onScrollToTable: _onScrollToTable,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const featureItems = [
    {
      id: 'optimizer',
      label: 'Policy & Budget Optimizer',
      icon: <Sparkles size={15} color="#16a34a" />,
      active: activeTab === 'optimizer',
      action: () => onTabChange('optimizer'),
      badge: 'Main Engine',
    },
    {
      id: 'single_scenario',
      label: 'Single Counterfactual Studio',
      icon: <Play size={15} color="#3b82f6" />,
      active: activeTab === 'single_scenario',
      action: () => onTabChange('single_scenario'),
      badge: 'Custom Levers',
    },
    {
      id: 'portfolio_table',
      label: 'Portfolio Comparison Table',
      icon: <Table size={15} color="#d97706" />,
      active: false,
      action: () => {
        if (activeTab !== 'optimizer') onTabChange('optimizer');
        setTimeout(() => {
          const el = document.getElementById('portfolio-comparison-table');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      },
      badge: 'Table Feature',
    },
    {
      id: 'feature_audit',
      label: 'Feature Audit Table',
      icon: <Layers size={15} color="#8b5cf6" />,
      active: false,
      action: () => {
        const el = document.getElementById('feature-audit-table');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      badge: 'Table Feature',
    },
    {
      id: 'stress_testing',
      label: 'Stress Testing Matrix',
      icon: <Activity size={15} color="#ef4444" />,
      active: false,
      action: () => {
        if (activeTab !== 'optimizer') onTabChange('optimizer');
        setTimeout(() => {
          const el = document.getElementById('stress-testing-section');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      },
      badge: 'Table Feature',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(40, 122, 69, 0.22)',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(22, 38, 25, 0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#166534',
              background: 'rgba(34, 197, 94, 0.14)',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            SIMULATOR TABLE &amp; FEATURE MENUS
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Hover over the menu below to fan out and explore all simulator features
          </span>
        </div>

        {/* Quick policy preset trigger */}
        {onSelectPreset && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setPresetsOpen(!presetsOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                color: '#166534',
                cursor: 'pointer',
              }}
            >
              <span>🌿 Policy Presets Menu</span>
              <ChevronDown size={13} />
            </button>

            {presetsOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  zIndex: 250,
                  background: '#ffffff',
                  border: '1px solid rgba(40, 122, 69, 0.25)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
                  minWidth: '240px',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onSelectPreset('pune_action_plan');
                    setPresetsOpen(false);
                  }}
                >
                  <Trees size={14} color="#16a34a" />
                  <span>Pune Clean Air Plan 2026</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onSelectPreset('ev_transition');
                    setPresetsOpen(false);
                  }}
                >
                  <Zap size={14} color="#059669" />
                  <span>50% EV Transit Fleet</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onSelectPreset('green_buffer');
                    setPresetsOpen(false);
                  }}
                >
                  <Trees size={14} color="#10b981" />
                  <span>35% Canopy Buffer</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onSelectPreset('winter_emergency');
                    setPresetsOpen(false);
                  }}
                >
                  <AlertTriangle size={14} color="#ea580c" />
                  <span>Winter Smog Curbs</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The Stacking Navbar Item Stack */}
      <div
        className="feature-stacking-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          padding: '0.4rem 0',
          overflowX: 'visible',
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          {featureItems.map((item, index) => {
            const stackOffset = expanded ? 0 : -80 * index;

            return (
              <motion.div
                key={item.id}
                initial={{ x: -80 * index }}
                animate={{ x: stackOffset }}
                transition={{
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                  delay: expanded ? 0.04 * index : 0.02 * (featureItems.length - index),
                  type: 'spring',
                  stiffness: 260,
                  damping: 22,
                }}
                style={{
                  zIndex: item.active ? 150 : 100 - index,
                  position: 'relative',
                }}
              >
                <button
                  type="button"
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: item.active ? 700 : 500,
                    padding: '0.6rem 1.15rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: item.active
                      ? 'linear-gradient(135deg, #166534 0%, #15803d 100%)'
                      : 'rgba(255, 255, 255, 0.95)',
                    color: item.active ? '#ffffff' : '#1e293b',
                    border: item.active
                      ? '1.5px solid #22c55e'
                      : '1px solid rgba(40, 122, 69, 0.22)',
                    boxShadow: item.active
                      ? '0 4px 16px rgba(22, 101, 52, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.06)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                      e.currentTarget.style.color = '#166534';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                      e.currentTarget.style.borderColor = 'rgba(40, 122, 69, 0.22)';
                      e.currentTarget.style.color = '#1e293b';
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: item.active
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'rgba(40, 122, 69, 0.1)',
                      color: item.active ? '#ffffff' : '#166534',
                    }}
                  >
                    {item.badge}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
