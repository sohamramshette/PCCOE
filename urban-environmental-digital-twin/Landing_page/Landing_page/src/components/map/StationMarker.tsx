import React, { useEffect, useRef } from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { AlertItem } from '../../types/alert';
import { StationPopup } from './StationPopup';

interface StationMarkerProps {
  station: Station;
  isSelected: boolean;
  latestObservation?: ObservationItem | null;
  alerts?: AlertItem[];
  isOutage?: boolean;
  onSelect: (stationId: number) => void;
  showTrafficBuffer: boolean;
  showActivityBuffer: boolean;
}

export const StationMarker: React.FC<StationMarkerProps> = ({
  station,
  isSelected,
  latestObservation,
  alerts = [],
  isOutage = false,
  onSelect,
  showTrafficBuffer,
  showActivityBuffer,
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  // Auto-open popup when selected externally
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const hasActiveAlerts = alerts && alerts.length > 0;

  const customIcon = L.divIcon({
    className: 'custom-station-marker-wrapper',
    html: `
      <div class="custom-station-pin ${isSelected ? 'selected' : ''} ${isOutage ? 'outage' : hasActiveAlerts ? 'has-alert' : ''}" style="${isOutage ? 'background: #f59e0b; border-color: #b45309;' : ''}" title="${station.station_name}${isOutage ? ' (SIMULATED OUTAGE)' : hasActiveAlerts ? ` (${alerts.length} active alerts)` : ''}">
        <div class="pin-badge" style="${isOutage ? 'background: #d97706;' : ''}">
          <span class="pin-id">${isOutage ? '⚡' : station.station_id}</span>
          ${isOutage ? `<span class="pin-alert-count" style="background: #dc2626;">OFF</span>` : hasActiveAlerts ? `<span class="pin-alert-count">${alerts.length}</span>` : ''}
        </div>
        <div class="pin-pulse" style="${isOutage ? 'border-color: #f59e0b;' : ''}"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });

  return (
    <>
      {/* Optional 1.5 km Traffic Exposure Buffer Circle */}
      {showTrafficBuffer && (
        <Circle
          center={[station.latitude, station.longitude]}
          radius={1500}
          pathOptions={{
            color: '#2563eb',
            weight: 1.5,
            fillColor: '#2563eb',
            fillOpacity: 0.08,
            dashArray: '4, 4',
          }}
        />
      )}

      {/* Optional 2.0 km Activity Exposure Buffer Circle */}
      {showActivityBuffer && (
        <Circle
          center={[station.latitude, station.longitude]}
          radius={2000}
          pathOptions={{
            color: '#f59e0b',
            weight: 1.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.06,
            dashArray: '6, 6',
          }}
        />
      )}

      {/* Main Station Marker */}
      <Marker
        ref={markerRef}
        position={[station.latitude, station.longitude]}
        icon={customIcon}
        eventHandlers={{
          click: () => onSelect(station.station_id),
        }}
      >
        <Popup className="custom-leaflet-popup" autoPan={true} closeButton={true}>
          <StationPopup station={station} latestObservation={latestObservation} alerts={alerts} isOutage={isOutage} />
        </Popup>
      </Marker>
    </>
  );
};
