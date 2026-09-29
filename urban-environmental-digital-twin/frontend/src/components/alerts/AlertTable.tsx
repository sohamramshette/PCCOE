import React from 'react';
import { AlertItem } from '../../types/alert';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { formatAlertTypeName } from './AlertCard';
import { formatDateTime } from '../../utils/formatters';
import { Eye, MapPin, ArrowRight } from 'lucide-react';

interface AlertTableProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onViewOnTwin?: (stationId: number) => void;
  onResetFilters?: () => void;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  onSelectAlert,
  onViewOnTwin,
  onResetFilters,
}) => {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          No Alerts Found
        </div>
        <div style={{ fontSize: '0.85rem', marginBottom: onResetFilters ? '1.25rem' : 0 }}>
          No environmental anomalies match the current filter criteria.
        </div>
        {onResetFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetFilters}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            Clear / Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        overflowX: 'auto',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <th style={{ padding: '0.85rem 1rem' }}>Severity</th>
            <th style={{ padding: '0.85rem 1rem' }}>Station</th>
            <th style={{ padding: '0.85rem 1rem' }}>Event / Type</th>
            <th style={{ padding: '0.85rem 1rem' }}>Observed</th>
            <th style={{ padding: '0.85rem 1rem' }}>Threshold / Expected</th>
            <th style={{ padding: '0.85rem 1rem' }}>Detected Time</th>
            <th style={{ padding: '0.85rem 1rem' }}>Status</th>
            <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr
              key={alert.alert_id}
              onClick={() => onSelectAlert(alert)}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              className="table-row-hover"
            >
              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                <AlertSeverityBadge severity={alert.severity} size="sm" />
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={13} style={{ color: 'var(--primary)' }} />
                  <span>{alert.station_name || `Station ${alert.station_id}`}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ID: {alert.station_id}
                </div>
              </td>

              <td style={{ padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatAlertTypeName(alert.alert_type)}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    maxWidth: '280px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={alert.message}
                >
                  {alert.message}
                </div>
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                {alert.observed_value !== null ? (
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {alert.observed_value}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                      {alert.pollutant ? 'µg/m³' : ''}
                    </span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {alert.threshold_value !== null ? (
                    <span>Thr: {alert.threshold_value}</span>
                  ) : alert.expected_value !== null ? (
                    <span>Exp: {alert.expected_value}</span>
                  ) : (
                    '—'
                  )}
                  {alert.deviation != null && (
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        fontWeight: 600,
                        color: alert.deviation > 0 ? 'var(--danger)' : 'var(--text-muted)',
                      }}
                    >
                      ({alert.deviation > 0 ? `+${alert.deviation}` : alert.deviation}
                      {alert.alert_type === 'PM25_SPIKE' ? '%' : ''})
                    </span>
                  )}
                </div>
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {formatDateTime(alert.detected_at)}
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    backgroundColor:
                      alert.status === 'ACTIVE'
                        ? '#fee2e2'
                        : alert.status === 'ACKNOWLEDGED'
                        ? '#fef3c7'
                        : '#dcfce7',
                    color:
                      alert.status === 'ACTIVE'
                        ? '#991b1b'
                        : alert.status === 'ACKNOWLEDGED'
                        ? '#92400e'
                        : '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {alert.status}
                </span>
              </td>

              <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAlert(alert);
                    }}
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>
                  {onViewOnTwin && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      title="View on Digital Twin Map"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOnTwin(alert.station_id);
                      }}
                    >
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
