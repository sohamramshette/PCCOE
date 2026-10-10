import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Compass,
  Layers,
} from 'lucide-react';
import {
  TrajectoryWaypoint,
  ReceptorStationInfo,
} from '../../types/backtracking';
import { Station } from '../../types/station';

// Pune-PCMC Spatial Monitoring Bounds
const PUNE_PCMC_BOUNDS: [[number, number], [number, number]] = [
  [18.35, 73.65],
  [18.75, 74.05],
];

interface MapBoundsControllerProps {
  waypoints: TrajectoryWaypoint[];
  receptor: ReceptorStationInfo | null;
}

const MapBoundsController: React.FC<MapBoundsControllerProps> = ({ waypoints, receptor }) => {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length > 0) {
      const latLngs: [number, number][] = waypoints.map((w) => [w.latitude, w.longitude]);
      if (receptor) {
        latLngs.push([receptor.latitude, receptor.longitude]);
      }
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (receptor) {
      map.setView([receptor.latitude, receptor.longitude], 12);
    }
  }, [waypoints, receptor, map]);

  return null;
};

interface TrajectoryMapProps {
  waypoints: TrajectoryWaypoint[];
  receptor: ReceptorStationInfo | null;
  observedPm25?: number | null;
  networkStations?: Station[];
  coverageStatus?: string;
}

export const TrajectoryMap: React.FC<TrajectoryMapProps> = ({
  waypoints,
  receptor,
  observedPm25,
  networkStations = [],
  coverageStatus,
}) => {
  const [showDomainBounds, setShowDomainBounds] = useState<boolean>(true);
  const [showNetworkStations, setShowNetworkStations] = useState<boolean>(true);

  // Group waypoints into in-domain vs out-of-domain polyline segments
  const { inDomainSegments, outDomainSegments } = useMemo(() => {
    const inSegments: [number, number][][] = [];
    const outSegments: [number, number][][] = [];

    if (waypoints.length < 2) return { inDomainSegments: inSegments, outDomainSegments: outSegments };

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const segment: [number, number][] = [
        [p1.latitude, p1.longitude],
        [p2.latitude, p2.longitude],
      ];
      if (
        p1.spatial_coverage_status === 'EXCEEDED_LOCAL_DOMAIN' ||
        p2.spatial_coverage_status === 'EXCEEDED_LOCAL_DOMAIN'
      ) {
        outSegments.push(segment);
      } else {
        inSegments.push(segment);
      }
    }

    return { inDomainSegments: inSegments, outDomainSegments: outSegments };
  }, [waypoints]);

  // Receptor Icon
  const receptorIcon = useMemo(() => {
    return L.divIcon({
      className: 'receptor-marker-icon',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 13px;
          position: relative;
        ">
          R
          <div style="
            position: absolute;
            bottom: -6px;
            width: 8px;
            height: 8px;
            background: #2563eb;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38],
    });
  }, []);

  // Waypoint Marker Icon Generator
  const createWaypointIcon = (wp: TrajectoryWaypoint, isOrigin: boolean) => {
    const isExceeded = wp.spatial_coverage_status === 'EXCEEDED_LOCAL_DOMAIN';
    const bgColor = isOrigin
      ? isExceeded ? '#ea580c' : '#7c3aed'
      : isExceeded ? '#f59e0b' : '#0284c7';

    return L.divIcon({
      className: 'waypoint-marker-icon',
      html: `
        <div style="
          width: ${isOrigin ? '28px' : '22px'};
          height: ${isOrigin ? '28px' : '22px'};
          background: ${bgColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${isOrigin ? '11px' : '9px'};
          font-weight: 700;
          cursor: pointer;
        " title="${wp.step_hours_back}h ago (${wp.datetime_local_ist})">
          ${isOrigin ? 'T' : `-${wp.step_hours_back}`}
        </div>
      `,
      iconSize: isOrigin ? [28, 28] : [22, 22],
      iconAnchor: isOrigin ? [14, 14] : [11, 11],
      popupAnchor: [0, -14],
    });
  };

  // Network Station Icon
  const stationIcon = useMemo(() => {
    return L.divIcon({
      className: 'network-station-marker-icon',
      html: `
        <div style="
          width: 14px;
          height: 14px;
          background: #475569;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        "></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10],
    });
  }, []);

  const defaultCenter: [number, number] = receptor
    ? [receptor.latitude, receptor.longitude]
    : [18.5204, 73.8567];

  return (
    <div className="backtracking-map-container" style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Map Layer Toolbar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.78rem',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showDomainBounds}
            onChange={(e) => setShowDomainBounds(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <Layers size={13} style={{ color: 'var(--primary)' }} />
          <span>Pune-PCMC Domain</span>
        </label>
        <span style={{ color: 'var(--border)' }}>|</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showNetworkStations}
            onChange={(e) => setShowNetworkStations(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span>Network Monitors</span>
        </label>
      </div>

      {/* Trajectory Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        left: '14px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-sm)',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        maxWidth: '280px',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Compass size={13} style={{ color: 'var(--primary)' }} />
          <span>Backward Transport Trajectory</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ width: '16px', height: '3px', background: '#0284c7', display: 'inline-block', borderRadius: '2px' }} />
          <span>Within Pune-PCMC Domain</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ width: '16px', height: '3px', borderTop: '3px dashed #ea580c', display: 'inline-block' }} />
          <span style={{ color: '#ea580c' }}>Boundary Extrapolated Flow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb', display: 'inline-block', color: 'white', fontSize: '8px', fontWeight: 700, textAlign: 'center', lineHeight: '12px' }}>R</span>
          <span>Receptor Station (t = 0)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block', color: 'white', fontSize: '8px', fontWeight: 700, textAlign: 'center', lineHeight: '12px' }}>T</span>
          <span>Calculated Origin (t = -{waypoints.length > 0 ? waypoints[waypoints.length - 1].step_hours_back : 0}h)</span>
        </div>
        {coverageStatus && (
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: coverageStatus === 'COMPLETED' ? 'var(--success)' : '#ea580c', fontWeight: 600 }}>
            {coverageStatus === 'COMPLETED' ? '• 100% Within Local Domain' : '• Exceeded Domain Boundary'}
          </div>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <MapBoundsController waypoints={waypoints} receptor={receptor} />

        {/* Pune-PCMC Domain Bounds Box */}
        {showDomainBounds && (
          <Rectangle
            bounds={PUNE_PCMC_BOUNDS}
            pathOptions={{
              color: '#3b82f6',
              weight: 1.5,
              dashArray: '5, 5',
              fillColor: '#3b82f6',
              fillOpacity: 0.03,
            }}
          >
            <Popup>
              <div style={{ fontSize: '0.8rem', padding: '4px' }}>
                <strong>Verified Pune-PCMC Monitoring Domain</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                  18.35°N – 18.75°N, 73.65°E – 74.05°E
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                  Coverage domain for multi-station meteorology & CAAQMS validation.
                </div>
              </div>
            </Popup>
          </Rectangle>
        )}

        {/* Other Active Monitoring Stations */}
        {showNetworkStations &&
          networkStations.map((stn) => {
            if (receptor && stn.station_id === receptor.station_id) return null;
            return (
              <Marker
                key={stn.station_id}
                position={[stn.latitude, stn.longitude]}
                icon={stationIcon}
              >
                <Popup>
                  <div style={{ fontSize: '0.8rem', padding: '4px' }}>
                    <strong>{stn.station_name}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      Station ID: {stn.station_id} | {stn.city}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {stn.zone_type} ({stn.monitoring_authority})
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Receptor Station Marker */}
        {receptor && (
          <Marker
            position={[receptor.latitude, receptor.longitude]}
            icon={receptorIcon}
          >
            <Popup>
              <div style={{ fontSize: '0.85rem', padding: '4px', minWidth: '200px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                  Receptor: {receptor.station_name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px' }}>
                  ID: {receptor.station_id} • {receptor.city}
                </div>
                {observedPm25 !== undefined && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Observed PM2.5 at Arrival:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: observedPm25 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {observedPm25 !== null ? `${observedPm25.toFixed(1)} µg/m³` : 'Offline / Missing'}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Coordinates: {receptor.latitude.toFixed(4)}°N, {receptor.longitude.toFixed(4)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* In-Domain Trajectory Polylines (Solid Blue) */}
        {inDomainSegments.map((seg, idx) => (
          <Polyline
            key={`in-${idx}`}
            positions={seg}
            pathOptions={{
              color: '#0284c7',
              weight: 4,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}

        {/* Out-Of-Domain Extrapolated Polylines (Dashed Amber) */}
        {outDomainSegments.map((seg, idx) => (
          <Polyline
            key={`out-${idx}`}
            positions={seg}
            pathOptions={{
              color: '#ea580c',
              weight: 3.5,
              dashArray: '6, 6',
              opacity: 0.85,
              lineCap: 'round',
            }}
          />
        ))}

        {/* Trajectory Waypoint Markers */}
        {waypoints.map((wp, idx) => {
          if (idx === 0) return null; // t=0 is receptor
          const isOrigin = idx === waypoints.length - 1;
          const isExceeded = wp.spatial_coverage_status === 'EXCEEDED_LOCAL_DOMAIN';

          return (
            <Marker
              key={`wp-${wp.step_hours_back}`}
              position={[wp.latitude, wp.longitude]}
              icon={createWaypointIcon(wp, isOrigin)}
            >
              <Popup>
                <div style={{ fontSize: '0.8rem', padding: '4px', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: isOrigin ? '#7c3aed' : 'var(--primary)' }}>
                      {isOrigin ? `Trajectory Origin (-${wp.step_hours_back}h)` : `Waypoint -${wp.step_hours_back}h`}
                    </strong>
                    {isExceeded && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        Out of Domain
                      </span>
                    )}
                  </div>

                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <div><strong>UTC:</strong> {wp.datetime_utc.replace('T', ' ').substring(0, 19)}</div>
                    <div><strong>IST:</strong> {wp.datetime_local_ist}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '6px', marginBottom: '6px', fontSize: '0.72rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Wind Speed:</div>
                      <strong>{wp.wind_speed_ms !== null ? `${wp.wind_speed_ms.toFixed(1)} m/s` : '—'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Wind Dir:</div>
                      <strong>{wp.wind_dir_deg !== null ? `${wp.wind_dir_deg.toFixed(0)}°` : '—'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>PBL Height:</div>
                      <strong>{wp.pbl_height_m !== null ? `${wp.pbl_height_m.toFixed(0)} m` : '—'}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Ventilation:</div>
                      <strong>{wp.ventilation_index_m2s !== null ? `${wp.ventilation_index_m2s.toFixed(0)} m²/s` : '—'}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <div>Coordinates: {wp.latitude.toFixed(4)}°N, {wp.longitude.toFixed(4)}°E</div>
                    <div>Distance from Receptor: {wp.cumulative_distance_km.toFixed(1)} km</div>
                    <div>Nearest Monitor: {wp.nearest_station_name || 'None within network'}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
