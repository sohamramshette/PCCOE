import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteOption, LocationItem } from '../../api/routing';
import { RouteComparisonResult } from '../../utils/routePollution';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { calcPM25SubIndex, getNAQICategoryInfo } from '../../utils/aqi';
import { Clock, Navigation, Wind } from 'lucide-react';

interface MapBoundsFitterProps {
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  selectedRoute: RouteOption | null;
  routes: RouteOption[];
}

const MapBoundsFitter: React.FC<MapBoundsFitterProps> = ({
  startLocation,
  destinationLocation,
  selectedRoute,
  routes,
}) => {
  const map = useMap();
  const prevRouteIdRef = useRef<string | null>(null);

  useEffect(() => {
    // If a specific route is selected or available
    const activeRoute = selectedRoute || routes[0];
    if (activeRoute && activeRoute.coordinates.length > 0) {
      if (prevRouteIdRef.current !== activeRoute.id) {
        prevRouteIdRef.current = activeRoute.id;
        const bounds = L.latLngBounds(activeRoute.coordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
      return;
    }

    // If both start and destination points are selected
    if (startLocation && destinationLocation) {
      const bounds = L.latLngBounds([
        [startLocation.lat, startLocation.lon],
        [destinationLocation.lat, destinationLocation.lon],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      return;
    }

    // If only one point is selected
    if (startLocation) {
      map.setView([startLocation.lat, startLocation.lon], 13);
    } else if (destinationLocation) {
      map.setView([destinationLocation.lat, destinationLocation.lon], 13);
    }
  }, [startLocation, destinationLocation, selectedRoute, routes, map]);

  return null;
};

interface RouteMapProps {
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  routes: RouteComparisonResult[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  stations: Station[];
  stationObservations: Record<number, ObservationItem | null>;
  showStations?: boolean;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  startLocation,
  destinationLocation,
  routes,
  selectedRouteId,
  onSelectRoute,
  stations,
  stationObservations,
  showStations = true,
}) => {
  // Center over Pune Metropolitan Region
  const defaultCenter: [number, number] = [18.53, 73.85];
  const defaultZoom = 12;

  // Custom marker for Origin (Start)
  const startIcon = L.divIcon({
    className: 'cleaner-route-pin-wrapper',
    html: `
      <div style="
        background: #15803d;
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        border: 2.5px solid #86efac;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      ">
        A
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

  // Custom marker for Destination
  const destIcon = L.divIcon({
    className: 'cleaner-route-pin-wrapper',
    html: `
      <div style="
        background: #b91c1c;
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        border: 2.5px solid #fca5a5;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      ">
        B
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

  const selectedComparison =
    routes.find((r) => r.route.id === selectedRouteId) || routes[0] || null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', borderRadius: '18px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '480px', background: '#131b14' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapBoundsFitter
          startLocation={startLocation}
          destinationLocation={destinationLocation}
          selectedRoute={selectedComparison ? selectedComparison.route : null}
          routes={routes.map((r) => r.route)}
        />

        {/* Start Point Marker */}
        {startLocation && (
          <Marker position={[startLocation.lat, startLocation.lon]} icon={startIcon}>
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#15803d' }}>Starting Point (A)</strong>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{startLocation.name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{startLocation.subtitle}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationLocation && (
          <Marker position={[destinationLocation.lat, destinationLocation.lon]} icon={destIcon}>
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px' }}>
                <strong style={{ color: '#b91c1c' }}>Destination (B)</strong>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{destinationLocation.name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{destinationLocation.subtitle}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ambient Station Dots for Context */}
        {showStations &&
          stations.map((st) => {
            const obs = stationObservations[st.station_id];
            const pm25 = obs?.pm25;
            const subIndex = calcPM25SubIndex(pm25);
            const catInfo = subIndex !== null ? getNAQICategoryInfo(subIndex) : null;
            const markerColor = catInfo ? catInfo.color : '#94a3b8';

            const stationIcon = L.divIcon({
              className: 'station-context-marker',
              html: `
                <div style="
                  background: ${markerColor};
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  border: 2px solid #ffffff;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                " title="Station: ${st.station_name}"></div>
              `,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });

            return (
              <Marker
                key={st.station_id}
                position={[st.latitude, st.longitude]}
                icon={stationIcon}
              >
                <Popup>
                  <div style={{ color: '#111827', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700 }}>{st.station_name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {st.city} · Ambient Station
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px' }}>
                      PM2.5:{' '}
                      <strong>
                        {pm25 !== null && pm25 !== undefined
                          ? `${pm25.toFixed(1)} µg/m³`
                          : 'Unavailable'}
                      </strong>
                    </div>
                    {catInfo && (
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${catInfo.color}20`,
                          color: catInfo.color,
                          fontWeight: 700,
                          fontSize: '10px',
                          marginTop: '3px',
                        }}
                      >
                        {catInfo.category}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Genuine Road Route Polylines */}
        {routes.map(({ route, estimate, isLowestPollution }) => {
          const isSelected = route.id === (selectedRouteId || routes[0]?.route.id);

          // Route color logic:
          // Selected cleanest route -> Vibrant emerald green (#22c55e)
          // Selected standard route -> Bright sky blue (#0284c7)
          // Inactive routes -> Subtle slate gray (#64748b)
          const polyColor = isSelected
            ? isLowestPollution
              ? '#22c55e'
              : '#0284c7'
            : '#64748b';

          const polyWeight = isSelected ? 6 : 4;
          const polyOpacity = isSelected ? 0.95 : 0.6;

          return (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              pathOptions={{
                color: polyColor,
                weight: polyWeight,
                opacity: polyOpacity,
                lineJoin: 'round',
                lineCap: 'round',
              }}
              eventHandlers={{
                click: () => onSelectRoute(route.id),
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  <strong>{route.name}</strong> ({route.summary})
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    <span>{route.durationMinutes} min</span>
                    <span>·</span>
                    <Navigation size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    <span>{route.distanceKm} km</span>
                  </div>
                  {estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Wind size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      <span>
                        Est. PM2.5: <strong>{estimate.avgPm25} µg/m³</strong>
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Click to select this route
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>

      {/* Floating map legend / info pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'rgba(18, 26, 17, 0.92)',
          border: '1px solid rgba(163, 181, 147, 0.28)',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.74rem',
          color: '#c9d3bf',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          maxWidth: '240px',
        }}
      >
        <div style={{ fontWeight: 700, color: '#f4f6f0', marginBottom: '4px' }}>
          Corridor Key
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ width: '12px', height: '4px', background: '#22c55e', borderRadius: '2px' }} />
          <span>Selected (Lower pollution)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ width: '12px', height: '4px', background: '#0284c7', borderRadius: '2px' }} />
          <span>Selected (Primary / Faster)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ width: '12px', height: '4px', background: '#64748b', borderRadius: '2px' }} />
          <span>Alternate road options</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a3b593', border: '1px solid #fff' }} />
          <span>Monitoring stations</span>
        </div>
      </div>
    </div>
  );
};
