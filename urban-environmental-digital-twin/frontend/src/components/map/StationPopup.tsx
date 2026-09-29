import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Activity } from 'lucide-react';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { AlertItem } from '../../types/alert';
import { AlertSeverityBadge } from '../alerts/AlertSeverityBadge';
import { formatAlertTypeName } from '../alerts/AlertCard';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { formatNumber, formatDateTime } from '../../utils/formatters';

interface StationPopupProps {
  station: Station;
  latestObservation?: ObservationItem | null;
  alerts?: AlertItem[];
}

export const StationPopup: React.FC<StationPopupProps> = ({
  station,
  latestObservation,
  alerts = [],
}) => {
  const hasObservation = latestObservation && latestObservation.pm25 !== null && latestObservation.pm25 !== undefined;
  const pm25Value = hasObservation ? latestObservation.pm25 : null;
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');

  return (
    <div className="station-popup-content">
      <div className="station-popup-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={16} className="text-primary" />
          <h4 className="station-popup-title">{station.station_name}</h4>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          <span className="badge badge-primary">ID: {station.station_id}</span>
          <span className="badge badge-success">ACTIVE</span>
          <ProvenanceBadge classification="OBSERVED" />
        </div>
      </div>

      <div className="station-popup-body">
        {/* Active Alerts Banner if present */}
        {activeAlerts.length > 0 && (
          <div
            style={{
              padding: '0.5rem 0.65rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.6rem',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: '#991b1b' }}>
                <AlertSeverityBadge severity={activeAlerts[0].severity} size="sm" />
                <span>{activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}</span>
              </div>
              <Link to={`/alerts?station_id=${station.station_id}`} style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.72rem' }}>
                View all →
              </Link>
            </div>
            <div style={{ color: '#7f1d1d', lineHeight: 1.3 }}>
              <strong>{formatAlertTypeName(activeAlerts[0].alert_type)}:</strong> {activeAlerts[0].message}
            </div>
          </div>
        )}

        <div className="station-popup-row">
          <span className="popup-label">Authority:</span>
          <span className="popup-value">{station.monitoring_authority}</span>
        </div>
        <div className="station-popup-row">
          <span className="popup-label">Zoning Type:</span>
          <span className="popup-value">{station.zone_type}</span>
        </div>
        <div className="station-popup-row">
          <span className="popup-label">Coordinates:</span>
          <span className="popup-value font-mono">
            {station.latitude.toFixed(4)}° N, {station.longitude.toFixed(4)}° E
          </span>
        </div>
        {station.elevation_m !== undefined && station.elevation_m !== null && (
          <div className="station-popup-row">
            <span className="popup-label">Elevation:</span>
            <span className="popup-value">{station.elevation_m} m</span>
          </div>
        )}

        <div className="station-popup-pm25-box">
          <div className="pm25-box-header">
            <Activity size={13} className="text-primary" />
            <span>Latest Observed PM2.5</span>
          </div>
          <div className="pm25-box-value">
            {pm25Value !== null ? (
              <>
                <span className="value-number">{formatNumber(pm25Value, 1)}</span>
                <span className="value-unit">µg/m³</span>
              </>
            ) : (
              <span className="value-nodata">NO DATA</span>
            )}
          </div>
          {latestObservation?.datetime_utc && (
            <div className="pm25-box-time">
              Observed at: {formatDateTime(latestObservation.datetime_utc)}
            </div>
          )}
        </div>
      </div>

      <div className="station-popup-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <Link
          to={`/stations/${station.station_id}`}
          className="btn btn-primary btn-sm w-full"
          style={{ justifyContent: 'center' }}
        >
          <span>View Station Details</span>
          <ArrowRight size={14} />
        </Link>
        {activeAlerts.length > 0 && (
          <Link
            to={`/alerts?station_id=${station.station_id}`}
            className="btn btn-secondary btn-sm w-full"
            style={{ justifyContent: 'center', fontSize: '0.78rem' }}
          >
            <span>Inspect {activeAlerts.length} Station Alert{activeAlerts.length > 1 ? 's' : ''}</span>
          </Link>
        )}
      </div>
    </div>
  );
};
