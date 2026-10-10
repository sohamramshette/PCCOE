import React from 'react';
import { AlertTriangle, AlertCircle, Flame, Info, Bell } from 'lucide-react';
import { AlertSeverity } from '../../types/alert';

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
> = {
  CRITICAL: {
    label: 'Critical',
    bg: 'rgba(239, 68, 68, 0.18)',
    color: '#f87171',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: <Flame size={13} />,
  },
  HIGH: {
    label: 'High',
    bg: 'rgba(249, 115, 22, 0.18)',
    color: '#fb923c',
    border: 'rgba(249, 115, 22, 0.35)',
    icon: <AlertTriangle size={13} />,
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'rgba(234, 179, 8, 0.18)',
    color: '#facc15',
    border: 'rgba(234, 179, 8, 0.35)',
    icon: <AlertCircle size={13} />,
  },
  LOW: {
    label: 'Low',
    bg: 'rgba(56, 189, 248, 0.18)',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.35)',
    icon: <Info size={13} />,
  },
  INFO: {
    label: 'Info',
    bg: 'rgba(163, 181, 147, 0.18)',
    color: '#a3b593',
    border: 'rgba(163, 181, 147, 0.35)',
    icon: <Bell size={13} />,
  },
};

export const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
}) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;

  const fontSizes = { sm: '0.7rem', md: '0.75rem', lg: '0.85rem' };
  const paddings = {
    sm: '0.15rem 0.45rem',
    md: '0.2rem 0.55rem',
    lg: '0.3rem 0.75rem',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: paddings[size],
        borderRadius: 'var(--radius-sm)',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: fontSizes[size],
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.2,
      }}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
