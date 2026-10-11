import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteOption, LocationItem } from '../../api/routing';
import { RouteComparisonResult } from '../../utils/routePollution';
import { Station } from '../../types/station';
import { ObservationItem } from '../../types/observation';
import { calcPM25SubIndex, getNAQICategoryInfo } from '../../utils/aqi';
import { Clock, Navigation, Wind, Crosshair } from 'lucide-react';
import { GPSPosition, NavigationStatus } from '../../utils/navigationTracking';

interface MapBoundsFitterProps {
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  selectedRoute: RouteOption | null;
  routes: RouteOption[];
  isNavigating?: boolean;
}

const MapBoundsFitter: React.FC<MapBoundsFitterProps> = ({
  startLocation,
  destinationLocation,
  selectedRoute,
  routes,
  isNavigating = false,
}) => {
  const map = useMap();
  const prevRouteIdRef = useRef<string | null>(null);

  useEffect(() => {
    // If navigating, don't continually reset bounds unless route ID changes
    const activeRoute = selectedRoute || routes[0];
    if (activeRoute && activeRoute.coordinates.length > 0) {
      if (prevRouteIdRef.current !== activeRoute.id) {
        prevRouteIdRef.current = activeRoute.id;
        const bounds = L.latLngBounds(activeRoute.coordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
      return;
    }

    if (isNavigating) return;

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
  }, [startLocation, destinationLocation, selectedRoute, routes, isNavigating, map]);

  return null;
};

// Handles recentering map on user location when requested
const NavigationController: React.FC<{
  userLocation?: GPSPosition | null;
  recenterTrigger?: number;
}> = ({ userLocation, recenterTrigger }) => {
  const map = useMap();
  const prevTriggerRef = useRef<number | undefined>(recenterTrigger);

  useEffect(() => {
    if (recenterTrigger !== undefined && recenterTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = recenterTrigger;
      if (userLocation) {
        map.setView([userLocation.lat, userLocation.lon], 16, { animate: true });
      }
    }
  }, [recenterTrigger, userLocation, map]);

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
  // Live GPS & Navigation Props
  userLocation?: GPSPosition | null;
  isNavigating?: boolean;
  navStatus?: NavigationStatus;
  upcomingCoordinates?: [number, number][];
  recenterTrigger?: number;
  onRecenter?: () => void;
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
  userLocation,
  isNavigating = false,
  navStatus = 'following',
  upcomingCoordinates,
  recenterTrigger,
  onRecenter,
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

  // Distinct GPS marker for user location
  const createGpsIcon = (heading: number | null, navigating: boolean, status: NavigationStatus) => {
    const isOffRoute = status === 'off_route';
    const isArrived = status === 'arrived';
    const ringColor = isOffRoute ? '#f97316' : isArrived ? '#4ade80' : navigating ? '#22c55e' : '#38bdf8';
    const dotColor = isOffRoute ? '#ea580c' : isArrived ? '#16a34a' : navigating ? '#15803d' : '#0284c7';
    const hasHeading = heading !== null && heading !== undefined;
    const rotationStyle = hasHeading ? `transform: rotate(${heading}deg);` : '';

    return L.divIcon({
      className: 'gps-live-marker',
      html: `
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: ${ringColor};
            opacity: 0.4;
            animation: gpsRadarPulse 2s infinite ease-out;
          "></div>
          <div style="
            position: relative;
            background: ${dotColor};
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            ${rotationStyle}
          ">
            ${
              hasHeading
                ? `<div style="
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-bottom: 7px solid #ffffff;
                    transform: translateY(-2px);
                  "></div>`
                : `<div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>`
            }
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  };

  const selectedComparison =
    routes.find((r) => r.route.id === selectedRouteId) || routes[0] || null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', borderRadius: '18px', overflow: 'hidden' }}>
      <style>{`
        @keyframes gpsRadarPulse {
          0% { transform: scale(0.65); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

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
          isNavigating={isNavigating}
        />

        <NavigationController
          userLocation={userLocation}
          recenterTrigger={recenterTrigger}
        />

        {/* Start Point Marker (Only show if not currently covered by GPS marker or when navigating) */}
        {startLocation && (!userLocation || !isNavigating || Math.abs(startLocation.lat - userLocation.lat) > 0.001) && (
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

          const polyWeight = isSelected ? (isNavigating ? 6 : 6) : 4;
          const polyOpacity = isSelected ? (isNavigating ? 0.65 : 0.95) : 0.45;

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

        {/* Highlighted Upcoming Remaining Polyline during active navigation */}
        {isNavigating && upcomingCoordinates && upcomingCoordinates.length >= 2 && (
          <Polyline
            positions={upcomingCoordinates}
            pathOptions={{
              color: navStatus === 'off_route' ? '#f97316' : '#22c55e',
              weight: 7,
              opacity: 0.98,
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        )}

        {/* User GPS Accuracy Ring */}
        {userLocation && userLocation.accuracy > 0 && userLocation.accuracy <= 400 && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={userLocation.accuracy}
            pathOptions={{
              fillColor: navStatus === 'off_route' ? '#f97316' : '#38bdf8',
              fillOpacity: 0.12,
              color: navStatus === 'off_route' ? '#ea580c' : '#38bdf8',
              weight: 1,
              dashArray: '3, 4',
            }}
          />
        )}

        {/* Live GPS Position Marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={createGpsIcon(userLocation.heading, isNavigating, navStatus)}
          >
            <Popup>
              <div style={{ color: '#111827', fontSize: '12px', minWidth: '170px' }}>
                <strong style={{ color: isNavigating ? '#15803d' : '#0284c7' }}>
                  {isNavigating ? 'Active Navigation Position' : 'Current GPS Position'}
                </strong>
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  Coordinates: <strong>{userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  Accuracy: ±{Math.round(userLocation.accuracy)} meters
                </div>
                {userLocation.speed !== null && userLocation.speed !== undefined && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    Speed: {(userLocation.speed * 3.6).toFixed(1)} km/h
                  </div>
                )}
                <div
                  style={{
                    marginTop: '6px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      navStatus === 'off_route'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : navStatus === 'arrived'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color:
                      navStatus === 'off_route'
                        ? '#b91c1c'
                        : navStatus === 'arrived'
                        ? '#15803d'
                        : '#0369a1',
                    fontWeight: 700,
                    fontSize: '10px',
                    display: 'inline-block',
                  }}
                >
                  {navStatus === 'off_route'
                    ? 'Deviated from Route'
                    : navStatus === 'arrived'
                    ? 'Arrived at Destination'
                    : isNavigating
                    ? 'On Planned Route'
                    : 'GPS Lock Active'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Recenter Map Button */}
      {userLocation && (
        <button
          type="button"
          onClick={onRecenter}
          title="Recenter Map on My Location"
          aria-label="Recenter Map on My Location"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1000,
            background: 'rgba(18, 26, 17, 0.92)',
            border: '1px solid rgba(163, 181, 147, 0.35)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#f4f6f0',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
        >
          <Crosshair size={14} color="#86efac" />
          <span>Recenter on Me</span>
        </button>
      )}

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
        {userLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isNavigating ? '#22c55e' : '#38bdf8', border: '1.5px solid #fff' }} />
            <span style={{ fontWeight: 600, color: '#f4f6f0' }}>Your GPS Position</span>
          </div>
        )}
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
