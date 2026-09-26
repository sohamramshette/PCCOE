import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Activity } from 'lucide-react';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { formatNumber, formatDateTime } from '../../utils/formatters';

interface StationPopupProps {
  station: Station;
  latestObservation?: ObservationItem | null;
}

export const StationPopup: React.FC<StationPopupProps> = ({
  station,
  latestObservation,
}) => {
  const hasObservation = latestObservation && latestObservation.pm25 !== null && latestObservation.pm25 !== undefined;
  const pm25Value = hasObservation ? latestObservation.pm25 : null;

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

      <div className="station-popup-footer">
        <Link
          to={`/stations/${station.station_id}`}
          className="btn btn-primary btn-sm w-full"
          style={{ justifyContent: 'center' }}
        >
          <span>View Station Details</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};
