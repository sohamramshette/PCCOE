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
    bg: '#fee2e2',
    color: '#991b1b',
    border: '#fca5a5',
    icon: <Flame size={13} />,
  },
  HIGH: {
    label: 'High',
    bg: '#ffedd5',
    color: '#c2410c',
    border: '#fdba74',
    icon: <AlertTriangle size={13} />,
  },
  MEDIUM: {
    label: 'Medium',
    bg: '#fef3c7',
    color: '#92400e',
    border: '#fcd34d',
    icon: <AlertCircle size={13} />,
  },
  LOW: {
    label: 'Low',
    bg: '#e0f2fe',
    color: '#0369a1',
    border: '#7dd3fc',
    icon: <Info size={13} />,
  },
  INFO: {
    label: 'Info',
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
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
