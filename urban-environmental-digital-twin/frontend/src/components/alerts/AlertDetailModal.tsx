import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  MapPin,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { AlertItem } from '../../types/alert';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { formatAlertTypeName } from './AlertCard';
import { formatDateTime } from '../../utils/formatters';
import { acknowledgeAlert, resolveAlert } from '../../api/alerts';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onAlertUpdated?: (updated: AlertItem) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onAlertUpdated,
}) => {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'acknowledge' | 'resolve' | null>(null);

  if (!alert) return null;

  const handleAction = async (action: 'acknowledge' | 'resolve') => {
    try {
      setActionLoading(true);
      let updated: AlertItem;
      if (action === 'acknowledge') {
        updated = await acknowledgeAlert(alert.alert_id, note || undefined);
      } else {
        updated = await resolveAlert(alert.alert_id, note || undefined);
      }
      if (onAlertUpdated) {
        onAlertUpdated(updated);
      }
      setShowNoteInput(false);
      setNote('');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigateToTwin = () => {
    onClose();
    navigate(`/digital-twin?station=${alert.station_id}`);
  };

  const meta = alert.alert_metadata || {};

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <AlertSeverityBadge severity={alert.severity} size="lg" />
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
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
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                }}
              >
                #{alert.alert_id}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {formatAlertTypeName(alert.alert_type)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
              <MapPin size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>{alert.station_name || `Station ${alert.station_id}`}</span>
              <span style={{ color: 'var(--text-muted)' }}>· ID: {alert.station_id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message description */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--primary)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
          }}
        >
          {alert.message}
        </div>

        {/* Value Comparison Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observed</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {alert.observed_value !== null ? `${alert.observed_value}` : '—'}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.25rem', color: 'var(--text-muted)' }}>
                {alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Threshold</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {alert.threshold_value !== null ? `${alert.threshold_value}` : '—'}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.25rem', color: 'var(--text-muted)' }}>
                {alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expected / Baseline</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {alert.expected_value !== null ? `${alert.expected_value}` : '—'}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.25rem', color: 'var(--text-muted)' }}>
                {alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deviation</div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                marginTop: '0.2rem',
                color: alert.deviation && alert.deviation > 0 ? 'var(--danger)' : 'var(--text-primary)',
              }}
            >
              {alert.deviation != null ? (alert.deviation > 0 ? `+${alert.deviation}` : `${alert.deviation}`) : '—'}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.25rem' }}>
                {alert.alert_type === 'PM25_SPIKE' ? '%' : alert.pollutant ? 'µg/m³' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Environmental Context / Diagnostics Metadata */}
        {Object.keys(meta).length > 0 && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity size={15} style={{ color: 'var(--primary)' }} />
              <span>Environmental & Scientific Context</span>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.6rem',
                fontSize: '0.82rem',
              }}
            >
              {Object.entries(meta).map(([key, val]) => (
                <div key={key}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}:
                  </span>{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temporal & Provenance Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.6rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>Detected:</span> {formatDateTime(alert.detected_at)}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Commenced:</span> {formatDateTime(alert.started_at)}
          </div>
          {alert.ended_at && (
            <div>
              <span style={{ fontWeight: 600 }}>Resolved:</span> {formatDateTime(alert.ended_at)}
            </div>
          )}
          <div>
            <span style={{ fontWeight: 600 }}>Provenance:</span> {alert.source}
          </div>
        </div>

        {/* Lifecycle Actions & Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {alert.status === 'ACTIVE' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() => {
                  setPendingAction('acknowledge');
                  setShowNoteInput(true);
                }}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
              >
                Acknowledge Alert
              </button>
            )}

            {alert.status !== 'RESOLVED' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() => {
                  setPendingAction('resolve');
                  setShowNoteInput(true);
                }}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem', color: 'var(--success)' }}
              >
                Resolve Alert
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNavigateToTwin}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>View on Digital Twin</span>
            <ArrowUpRight size={15} />
          </button>
        </div>

        {/* Operational Note Input for Actions */}
        {showNoteInput && (
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Add Operational Note ({pendingAction === 'acknowledge' ? 'Acknowledgment' : 'Resolution'}):
            </div>
            <input
              type="text"
              placeholder="e.g. Field team dispatched / Sensor re-calibrated / Natural episode verified"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNoteInput(false)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => pendingAction && handleAction(pendingAction)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              >
                Confirm {pendingAction === 'acknowledge' ? 'Acknowledge' : 'Resolve'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
