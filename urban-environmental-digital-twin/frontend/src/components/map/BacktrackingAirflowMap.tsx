import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  TrajectoryWaypoint,
  ReceptorStationInfo,
  CorrelatedStationEvidence,
} from '../../types/backtracking';

interface MapBoundsControllerProps {
  waypoints: TrajectoryWaypoint[];
  receptor: ReceptorStationInfo | null;
}

const MapBoundsController: React.FC<MapBoundsControllerProps> = ({ waypoints, receptor }) => {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length > 0) {
      const coords: [number, number][] = waypoints.map((w) => [w.latitude, w.longitude]);
      if (receptor) {
        coords.push([receptor.latitude, receptor.longitude]);
      }
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } else if (receptor) {
      map.setView([receptor.latitude, receptor.longitude], 12);
    }
  }, [waypoints, receptor, map]);

  return null;
};

interface BacktrackingAirflowMapProps {
  waypoints: TrajectoryWaypoint[];
  receptor: ReceptorStationInfo | null;
  observedPm25: number | null;
  upwindStations?: CorrelatedStationEvidence[];
  downwindStations?: CorrelatedStationEvidence[];
}

export const BacktrackingAirflowMap: React.FC<BacktrackingAirflowMapProps> = ({
  waypoints,
  receptor,
  observedPm25,
  upwindStations = [],
  downwindStations = [],
}) => {
  const defaultCenter: [number, number] = [18.53, 73.85];
  const defaultZoom = 11;

  // Polyline positions: from origin (oldest) to receptor (newest)
  const trajectoryCoordinates = useMemo<[number, number][]>(() => {
    if (!waypoints || waypoints.length === 0) return [];
    // waypoints[0] is at arrival, waypoints[last] is origin
    return waypoints.map((w) => [w.latitude, w.longitude]);
  }, [waypoints]);

  // Origin point (oldest waypoint)
  const originWaypoint = useMemo(() => {
    if (!waypoints || waypoints.length === 0) return null;
    return waypoints[waypoints.length - 1];
  }, [waypoints]);

  // Key interval waypoints for milestone markers (every 3 hours)
  const milestoneWaypoints = useMemo(() => {
    if (!waypoints || waypoints.length <= 2) return [];
    return waypoints.filter((w) => w.step_hours_back > 0 && w.step_hours_back % 3 === 0);
  }, [waypoints]);

  // Custom Receptor Marker Pin (Arrival)
  const receptorIcon = useMemo(() => {
    return L.divIcon({
      className: 'receptor-arrival-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #15803d;
          border: 3px solid #86efac;
          border-radius: 50%;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  }, []);

  // Custom Origin Marker Pin (Upwind Origin)
  const originIcon = useMemo(() => {
    return L.divIcon({
      className: 'origin-start-pin',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #0284c7;
          border: 2.5px solid #7dd3fc;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
        ">
          AIR
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', borderRadius: '20px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '520px', background: '#121a12' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <MapBoundsController waypoints={waypoints} receptor={receptor} />

        {/* 1. Atmospheric Airflow Transport Path */}
        {trajectoryCoordinates.length > 1 && (
          <>
            {/* Outer soft cyan glow line */}
            <Polyline
              positions={trajectoryCoordinates}
              pathOptions={{
                color: '#38bdf8',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner distinct directional airflow line (dashed to indicate atmospheric advection) */}
            <Polyline
              positions={trajectoryCoordinates}
              pathOptions={{
                color: '#0284c7',
                weight: 4,
                opacity: 0.95,
                dashArray: '8, 6',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  <strong>Atmospheric Airflow Path</strong>
                  <br />
                  <span>Direction of regional air mass transport</span>
                  <br />
                  <span>Model: 2D Kinematic Advection (ERA5-Land Winds)</span>
                </div>
              </Tooltip>
            </Polyline>
          </>
        )}

        {/* 2. Milestone Waypoint Dots along the Path (-3h, -6h, -9h) */}
        {milestoneWaypoints.map((w) => (
          <CircleMarker
            key={w.step_hours_back}
            center={[w.latitude, w.longitude]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#0284c7',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div style={{ fontSize: '11px' }}>
                <strong>-{w.step_hours_back} Hours Ago</strong>
                <div>{w.datetime_local_ist}</div>
                <div>Distance: {w.cumulative_distance_km.toFixed(1)} km from monitor</div>
                {w.wind_speed_ms !== null && (
                  <div>Wind: {(w.wind_speed_ms * 3.6).toFixed(1)} km/h ({w.wind_dir_deg}°)</div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* 3. Air Parcel Origin Marker (Oldest Waypoint) */}
        {originWaypoint && (
          <Marker
            position={[originWaypoint.latitude, originWaypoint.longitude]}
            icon={originIcon}
          >
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#0284c7' }}>Air Parcel Estimated Origin</strong>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>
                  {originWaypoint.step_hours_back} hours prior to arrival
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>
                  Time: {originWaypoint.datetime_local_ist}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>
                  Total transport distance: {originWaypoint.cumulative_distance_km.toFixed(1)} km
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', fontStyle: 'italic' }}>
                  * Estimated atmospheric path origin based on ERA5-Land wind fields.
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 4. Receptor Monitoring Station (Arrival) */}
        {receptor && (
          <Marker
            position={[receptor.latitude, receptor.longitude]}
            icon={receptorIcon}
          >
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#15803d' }}>Selected Monitoring Station</strong>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{receptor.station_name}</div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>
                  {receptor.city} · {receptor.zone_type}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  Observed PM2.5: <strong>{observedPm25 !== null ? `${observedPm25.toFixed(1)} µg/m³` : 'Available'}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                  Air mass arrival destination
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 5. Upwind and Downwind Context Stations */}
        {upwindStations.map((st) => (
          <CircleMarker
            key={`upwind-${st.station_id}`}
            center={[st.latitude, st.longitude]}
            radius={8}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#0284c7' }}>Upwind Station: {st.station_name}</strong>
                <div>Distance: {st.distance_to_receptor_km.toFixed(1)} km upwind</div>
                <div>Observed PM2.5: {st.observed_pm25_at_arrival ?? 'N/A'} µg/m³</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  Air mass traversed this general directional sector
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {downwindStations.map((st) => (
          <CircleMarker
            key={`downwind-${st.station_id}`}
            center={[st.latitude, st.longitude]}
            radius={6}
            pathOptions={{
              color: '#94a3b8',
              fillColor: '#64748b',
              fillOpacity: 0.7,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#64748b' }}>Downwind Station: {st.station_name}</strong>
                <div>Distance: {st.distance_to_receptor_km.toFixed(1)} km downwind</div>
                <div>Observed PM2.5: {st.observed_pm25_at_arrival ?? 'N/A'} µg/m³</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Floating Map Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.25)',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '0.74rem',
          color: '#334155',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          maxWidth: '260px',
        }}
      >
        <div style={{ fontWeight: 700, color: '#0d1710', marginBottom: '6px' }}>
          Atmospheric Map Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '16px', height: '3px', background: '#0284c7', borderTop: '1px dashed #38bdf8' }} />
          <span>Calculated Airflow Path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#15803d', border: '1.5px solid #86efac' }} />
          <span>Local Receptor Monitor (Arrival)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', border: '1.5px solid #7dd3fc' }} />
          <span>Air Parcel Upwind Origin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
          <span>Upwind Correlated Stations</span>
        </div>
      </div>
    </div>
  );
};
