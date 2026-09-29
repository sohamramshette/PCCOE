import React from 'react';
import { AlertItem } from '../../types/alert';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface AlertCardProps {
  alert: AlertItem;
  onClick?: (alert: AlertItem) => void;
  onViewOnMap?: (stationId: number) => void;
  compact?: boolean;
}

export function formatAlertTypeName(type: string): string {
  switch (type) {
    case 'PM25_THRESHOLD':
      return 'PM2.5 Threshold Exceeded';
    case 'PM10_THRESHOLD':
      return 'PM10 Threshold Exceeded';
    case 'NO2_THRESHOLD':
      return 'NO₂ Threshold Exceeded';
    case 'SO2_THRESHOLD':
      return 'SO₂ Threshold Exceeded';
    case 'CO_THRESHOLD':
      return 'CO Threshold Exceeded';
    case 'O3_THRESHOLD':
      return 'Ozone (O₃) Threshold Exceeded';
    case 'PM25_SPIKE':
      return 'PM2.5 Sudden Spike';
    case 'PM25_ANOMALY':
      return 'Statistical PM2.5 Anomaly';
    case 'FORECAST_DEVIATION':
      return 'Forecast vs Actual Divergence';
    case 'LOW_WIND':
      return 'Calm / Constrained Surface Winds';
    case 'LOW_PBL':
      return 'Shallow Boundary Layer';
    case 'ATMOSPHERIC_STAGNATION':
      return 'Atmospheric Stagnation';
    case 'SENSOR_OFFLINE':
      return 'Monitoring Hardware Offline';
    case 'DATA_GAP':
      return 'Telemetry Data Gap';
    case 'SENSOR_ANOMALY':
      return 'Sensor Reading Inconsistency';
    default:
      return type.replace(/_/g, ' ');
  }
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onClick,
  onViewOnMap,
  compact = false,
}) => {
  return (
    <div
      onClick={() => onClick && onClick(alert)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: 'var(--shadow-sm)',
      }}
      className="alert-card-hoverable"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <AlertSeverityBadge severity={alert.severity} size="sm" />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: alert.status === 'ACTIVE' ? '#fee2e2' : alert.status === 'ACKNOWLEDGED' ? '#fef3c7' : '#dcfce7',
              color: alert.status === 'ACTIVE' ? '#991b1b' : alert.status === 'ACKNOWLEDGED' ? '#92400e' : '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {alert.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <Clock size={12} />
          <span>{formatDateTime(alert.detected_at)}</span>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: compact ? '0.88rem' : '0.95rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {formatAlertTypeName(alert.alert_type)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontWeight: 500 }}>{alert.station_name || `Station ${alert.station_id}`}</span>
        </div>
      </div>

      <div
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {alert.message}
      </div>

      {(alert.observed_value !== null || alert.threshold_value !== null) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '0.4rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
          }}
        >
          {alert.observed_value !== null && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Observed: </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {alert.observed_value} {alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          )}
          {alert.threshold_value !== null && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {alert.threshold_value} {alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          )}
          {alert.deviation != null && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Deviation: </span>
              <span
                style={{
                  fontWeight: 600,
                  color: alert.deviation > 0 ? 'var(--danger)' : 'var(--text-primary)',
                }}
              >
                {alert.deviation > 0 ? `+${alert.deviation}` : alert.deviation}
                {alert.alert_type === 'PM25_SPIKE' ? '%' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {onViewOnMap && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewOnMap(alert.station_id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span>View on Map</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
