import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUpDown,
  RotateCcw,
  Search,
  Car,
  Bike,
  Footprints,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Zap,
  Info,
  MapPin,
  RefreshCw,
  Sparkles,
  Route,
  Clock,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import {
  LocationItem,
  TravelMode,
  PUNE_LOCALITY_PRESETS,
  searchLocations,
  fetchRoadRoutes,
} from '../api/routing';
import {
  compareRoutes,
  RouteComparisonResult,
} from '../utils/routePollution';
import { RouteMap } from '../components/map/RouteMap';

export const CleanerRoutes: React.FC = () => {
  // Environmental Monitoring Data State
  const [stations, setStations] = useState<Station[]>([]);
  const [stationObservations, setStationObservations] = useState<Record<number, ObservationItem | null>>({});
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(true);

  // Route Input State
  const [startQuery, setStartQuery] = useState<string>('Kothrud');
  const [selectedStart, setSelectedStart] = useState<LocationItem | null>(PUNE_LOCALITY_PRESETS[1]); // Kothrud
  const [startSuggestions, setStartSuggestions] = useState<LocationItem[]>([]);
  const [isStartFocused, setIsStartFocused] = useState<boolean>(false);

  const [destQuery, setDestQuery] = useState<string>('Hinjawadi');
  const [selectedDest, setSelectedDest] = useState<LocationItem | null>(PUNE_LOCALITY_PRESETS[2]); // Hinjawadi
  const [destSuggestions, setDestSuggestions] = useState<LocationItem[]>([]);
  const [isDestFocused, setIsDestFocused] = useState<boolean>(false);

  const [travelMode, setTravelMode] = useState<TravelMode>('driving');

  // Routing Results State
  const [routeResults, setRouteResults] = useState<RouteComparisonResult[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // 1. Fetch Station Network and Latest Observations
  const loadStationData = useCallback(async () => {
    try {
      setIsLoadingStations(true);
      const stationList = await getStations(true);
      setStations(stationList);

      const obsMap: Record<number, ObservationItem | null> = {};
      await Promise.all(
        stationList.map(async (st) => {
          try {
            const res = await getObservations(st.station_id, { limit: 1, order: 'desc' });
            obsMap[st.station_id] = res.items.length > 0 ? res.items[0] : null;
          } catch {
            obsMap[st.station_id] = null;
          }
        })
      );
      setStationObservations(obsMap);
    } catch {
      // Backend station network fallback
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    loadStationData();
  }, [loadStationData]);

  // Autocomplete search handlers
  useEffect(() => {
    if (!startQuery.trim()) {
      setStartSuggestions(PUNE_LOCALITY_PRESETS.slice(0, 6));
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(startQuery);
      setStartSuggestions(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    if (!destQuery.trim()) {
      setDestSuggestions(PUNE_LOCALITY_PRESETS.slice(0, 6));
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(destQuery);
      setDestSuggestions(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [destQuery]);

  // Execute Route Computation
  const handleFindRoutes = useCallback(async () => {
    if (!selectedStart || !selectedDest) {
      setRouteError('Please select both a starting point and a destination.');
      return;
    }

    if (
      Math.abs(selectedStart.lat - selectedDest.lat) < 0.001 &&
      Math.abs(selectedStart.lon - selectedDest.lon) < 0.001
    ) {
      setRouteError('Starting point and destination cannot be identical.');
      return;
    }

    setIsCalculatingRoutes(true);
    setRouteError(null);

    try {
      // 1. Fetch genuine road routes from OSRM
      const routes = await fetchRoadRoutes(selectedStart, selectedDest, travelMode);

      if (!routes || routes.length === 0) {
        setRouteError('No drivable road routes were found between these locations.');
        setRouteResults([]);
        return;
      }

      // 2. Perform spatial IDW sampling along road geometry using active station network
      const compared = compareRoutes(routes, stations, stationObservations);
      setRouteResults(compared);

      // Select lowest pollution route by default if available, otherwise first route
      const cleanOption = compared.find((c) => c.isLowestPollution);
      setSelectedRouteId(cleanOption ? cleanOption.route.id : compared[0].route.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to calculate road routes';
      setRouteError(`Routing error: ${msg}. Please verify your connectivity or try another location.`);
      setRouteResults([]);
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [selectedStart, selectedDest, travelMode, stations, stationObservations]);

  // Auto-run initial sample route once stations are loaded
  useEffect(() => {
    if (stations.length > 0 && routeResults.length === 0 && !isCalculatingRoutes && !routeError) {
      handleFindRoutes();
    }
  }, [stations.length, routeResults.length, isCalculatingRoutes, routeError, handleFindRoutes]);

  // Swap Start and Destination
  const handleSwapLocations = () => {
    const prevStartLoc = selectedStart;
    const prevStartQ = startQuery;

    setSelectedStart(selectedDest);
    setStartQuery(destQuery);

    setSelectedDest(prevStartLoc);
    setDestQuery(prevStartQ);
  };

  // Clear Form
  const handleClearForm = () => {
    setStartQuery('');
    setSelectedStart(null);
    setDestQuery('');
    setSelectedDest(null);
    setRouteResults([]);
    setSelectedRouteId(null);
    setRouteError(null);
  };

  // Preset Commute Pickers
  const handleApplyPresetCommute = (
    startName: string,
    destName: string
  ) => {
    const startItem = PUNE_LOCALITY_PRESETS.find((p) => p.name === startName);
    const destItem = PUNE_LOCALITY_PRESETS.find((p) => p.name === destName);

    if (startItem && destItem) {
      setSelectedStart(startItem);
      setStartQuery(startItem.name);
      setSelectedDest(destItem);
      setDestQuery(destItem.name);
    }
  };

  // Selected route comparison item
  const selectedRouteComparison = useMemo(() => {
    return (
      routeResults.find((r) => r.route.id === selectedRouteId) ||
      routeResults[0] ||
      null
    );
  }, [routeResults, selectedRouteId]);

  // Timestamp formatting
  const formattedDataTimestamp = useMemo(() => {
    const ts = selectedRouteComparison?.estimate.dataTimestamp;
    if (!ts) return 'Current hourly feed';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return 'Recent hourly observation';
    }
  }, [selectedRouteComparison]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(28, 42, 27, 0.92) 0%, rgba(18, 28, 17, 0.96) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '1.75rem 2.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(143, 160, 126, 0.22)',
                color: '#a3b593',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Route size={13} />
              Cleaner Routes
            </span>
            <span style={{ fontSize: '11px', color: '#9eab93' }}>Pune &amp; Pimpri-Chinchwad Commute Advisor</span>
          </div>

          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: '#f4f6f0',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
            }}
          >
            Compare Cleaner Travel Routes
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#c9d3bf', maxWidth: '750px', lineHeight: 1.5 }}>
            Help ordinary residents choose travel paths with lower estimated particulate pollution.
            Routes use genuine road networks and continuous air quality spatial estimations.
          </p>
        </div>

        {/* Data Provenance Pill */}
        <div
          style={{
            background: 'rgba(14, 20, 14, 0.7)',
            border: '1px solid rgba(163, 181, 147, 0.2)',
            borderRadius: '14px',
            padding: '10px 16px',
            fontSize: '0.78rem',
            color: '#a3b593',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f4f6f0' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLoadingStations ? '#facc15' : '#4ade80' }} />
            <span>{isLoadingStations ? 'Syncing Station Network...' : 'Continuous Monitoring Network Active'}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#9eab93' }}>
            {isLoadingStations ? 'Connecting to continuous sensors...' : `${stations.length || 6} CPCB/MPCB Ground Stations · IDW Spatial Extrapolation`}
          </span>
        </div>
      </div>

      {/* 2. Route Planner & Controls Card */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="#8fa07e" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
              Plan Your Journey
            </h2>
          </div>

          {/* Quick Commute Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#9eab93', marginRight: '4px' }}>Popular commutes:</span>
            {[
              { label: 'Kothrud ➔ Hinjawadi', s: 'Kothrud', d: 'Hinjawadi' },
              { label: 'Swargate ➔ Shivajinagar', s: 'Swargate', d: 'Shivajinagar' },
              { label: 'Viman Nagar ➔ Hadapsar', s: 'Viman Nagar', d: 'Hadapsar / Magarpatta' },
              { label: 'Akurdi ➔ Bhosari', s: 'Akurdi', d: 'Bhosari' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPresetCommute(p.s, p.d)}
                style={{
                  background: 'rgba(143, 160, 126, 0.12)',
                  border: '1px solid rgba(163, 181, 147, 0.24)',
                  borderRadius: '8px',
                  padding: '4px 9px',
                  color: '#c9d3bf',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) auto minmax(240px, 1fr) auto minmax(180px, auto)',
            gap: '12px',
            alignItems: 'center',
          }}
          className="cleaner-routes-form-grid"
        >
          {/* Starting Point Input with Autocomplete */}
          <div style={{ position: 'relative' }}>
            <label
              htmlFor="start-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#86efac',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '6px',
              }}
            >
              <MapPin size={12} color="#86efac" />
              Starting Point
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="start-input"
                type="text"
                placeholder="Search starting locality (e.g. Kothrud)..."
                value={startQuery}
                onChange={(e) => {
                  setStartQuery(e.target.value);
                  setSelectedStart(null);
                }}
                onFocus={() => setIsStartFocused(true)}
                onBlur={() => setTimeout(() => setIsStartFocused(false), 250)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(14, 20, 14, 0.85)',
                  border: '1px solid rgba(163, 181, 147, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#f4f6f0',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border 0.2s ease',
                }}
              />
              {selectedStart && (
                <CheckCircle2
                  size={16}
                  color="#4ade80"
                  style={{ position: 'absolute', right: '12px', top: '12px' }}
                />
              )}
            </div>

            {/* Start Suggestions Dropdown */}
            {isStartFocused && startSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 2000,
                  background: '#152016',
                  border: '1px solid rgba(163, 181, 147, 0.35)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  marginTop: '4px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {startSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={() => {
                      setSelectedStart(item);
                      setStartQuery(item.name);
                      setIsStartFocused(false);
                    }}
                    style={{
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(163, 181, 147, 0.1)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(143, 160, 126, 0.18)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f4f6f0' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9eab93' }}>{item.subtitle}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={handleSwapLocations}
              title="Swap starting point and destination"
              aria-label="Swap starting point and destination"
              style={{
                background: 'rgba(143, 160, 126, 0.14)',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                borderRadius: '12px',
                color: '#f4f6f0',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Destination Input with Autocomplete */}
          <div style={{ position: 'relative' }}>
            <label
              htmlFor="dest-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fca5a5',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '6px',
              }}
            >
              <MapPin size={12} color="#fca5a5" />
              Destination
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="dest-input"
                type="text"
                placeholder="Search destination (e.g. Hinjawadi)..."
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setSelectedDest(null);
                }}
                onFocus={() => setIsDestFocused(true)}
                onBlur={() => setTimeout(() => setIsDestFocused(false), 250)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(14, 20, 14, 0.85)',
                  border: '1px solid rgba(163, 181, 147, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#f4f6f0',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border 0.2s ease',
                }}
              />
              {selectedDest && (
                <CheckCircle2
                  size={16}
                  color="#4ade80"
                  style={{ position: 'absolute', right: '12px', top: '12px' }}
                />
              )}
            </div>

            {/* Destination Suggestions Dropdown */}
            {isDestFocused && destSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 2000,
                  background: '#152016',
                  border: '1px solid rgba(163, 181, 147, 0.35)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  marginTop: '4px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {destSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={() => {
                      setSelectedDest(item);
                      setDestQuery(item.name);
                      setIsDestFocused(false);
                    }}
                    style={{
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(163, 181, 147, 0.1)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(143, 160, 126, 0.18)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f4f6f0' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9eab93' }}>{item.subtitle}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Travel Mode Toggle (Only supported modes by OSRM) */}
          <div style={{ paddingTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(14, 20, 14, 0.85)',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                borderRadius: '12px',
                padding: '3px',
              }}
            >
              {[
                { mode: 'driving' as TravelMode, icon: <Car size={15} />, label: 'Drive' },
                { mode: 'cycling' as TravelMode, icon: <Bike size={15} />, label: 'Bicycle' },
                { mode: 'walking' as TravelMode, icon: <Footprints size={15} />, label: 'Walk' },
              ].map((m) => {
                const active = travelMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setTravelMode(m.mode)}
                    title={m.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 11px',
                      border: 'none',
                      borderRadius: '9px',
                      background: active ? '#8fa07e' : 'transparent',
                      color: active ? '#121a11' : '#c9d3bf',
                      fontSize: '0.78rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Find Routes & Clear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={handleFindRoutes}
              disabled={isCalculatingRoutes || !selectedStart || !selectedDest}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #8fa07e 0%, #6e7e60 100%)',
                color: '#121a11',
                border: 'none',
                borderRadius: '12px',
                padding: '11px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isCalculatingRoutes || !selectedStart || !selectedDest ? 'not-allowed' : 'pointer',
                opacity: !selectedStart || !selectedDest ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(143, 160, 126, 0.3)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {isCalculatingRoutes ? (
                <>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Search size={15} />
                  <span>Find Routes</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClearForm}
              title="Clear route inputs"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                color: '#9eab93',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Error notification if routing fails */}
        {routeError && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{routeError}</span>
          </div>
        )}
      </div>

      {/* 3. Main Route Comparison & Interactive Map View */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 460px) 1fr',
          gap: '1.75rem',
          alignItems: 'start',
        }}
        className="cleaner-routes-results-layout"
      >
        {/* Left Column: Route Options Cards & Honest Trade-off Comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Route Alternatives ({routeResults.length})
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#9eab93', marginTop: '2px' }}>
                {selectedStart?.name} ➔ {selectedDest?.name}
              </div>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#a3b593' }}>
              Click card to preview path
            </span>
          </div>

          {/* Calculating state placeholder */}
          {isCalculatingRoutes && (
            <div
              style={{
                background: 'rgba(26, 38, 25, 0.7)',
                border: '1px solid rgba(163, 181, 147, 0.2)',
                borderRadius: '18px',
                padding: '2.5rem',
                textAlign: 'center',
                color: '#a3b593',
              }}
            >
              <RefreshCw size={28} style={{ animation: 'spin 1.2s linear infinite', marginBottom: '12px' }} />
              <div style={{ color: '#f4f6f0', fontWeight: 600 }}>Calculating road routes &amp; sampling air quality...</div>
              <div style={{ fontSize: '0.76rem', color: '#9eab93', marginTop: '4px' }}>
                Querying OpenStreetMap network and continuous monitoring stations
              </div>
            </div>
          )}

          {/* List of Route Cards */}
          {!isCalculatingRoutes &&
            routeResults.map((item) => {
              const { route, estimate, isLowestPollution, isFastest, recommendationBadge } = item;
              const isSelected = route.id === (selectedRouteId || routeResults[0]?.route.id);

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(145deg, rgba(32, 46, 30, 0.95) 0%, rgba(22, 32, 21, 0.98) 100%)'
                      : 'linear-gradient(145deg, rgba(24, 34, 23, 0.8) 0%, rgba(16, 23, 15, 0.9) 100%)',
                    border: isSelected
                      ? isLowestPollution
                        ? '2px solid #4ade80'
                        : '2px solid #38bdf8'
                      : '1px solid rgba(163, 181, 147, 0.2)',
                    borderRadius: '18px',
                    padding: '1.25rem 1.4rem',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? '0 12px 30px rgba(0, 0, 0, 0.45)'
                      : '0 4px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Bar: Badges & Route Title */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f4f6f0' }}>
                          {route.name}
                        </h3>
                        {recommendationBadge && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: isLowestPollution
                                ? 'rgba(74, 222, 128, 0.2)'
                                : 'rgba(56, 189, 248, 0.2)',
                              color: isLowestPollution ? '#4ade80' : '#38bdf8',
                              border: isLowestPollution
                                ? '1px solid rgba(74, 222, 128, 0.4)'
                                : '1px solid rgba(56, 189, 248, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isLowestPollution ? <Leaf size={10} /> : <Zap size={10} />}
                            {recommendationBadge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#9eab93', marginTop: '2px' }}>
                        {route.summary}
                      </div>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected
                          ? isLowestPollution
                            ? '5px solid #4ade80'
                            : '5px solid #38bdf8'
                          : '2px solid rgba(163, 181, 147, 0.4)',
                        background: isSelected ? '#152016' : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Travel Stats: Time, Distance */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(14, 20, 14, 0.65)',
                      marginTop: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9eab93', textTransform: 'uppercase' }}>
                        Travel Time
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f4f6f0' }}>
                        ~{route.durationMinutes} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>mins</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9eab93', textTransform: 'uppercase' }}>
                        Distance
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f4f6f0' }}>
                        {route.distanceKm} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>km</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Air Pollution Section */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background:
                        estimate.coverageStatus === 'VALID'
                          ? 'rgba(143, 160, 126, 0.1)'
                          : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(163, 181, 147, 0.16)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Leaf size={14} color="#8fa07e" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#c9d3bf' }}>
                          Estimated Route PM2.5:
                        </span>
                      </div>

                      {estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f6f0' }}>
                            {estimate.avgPm25}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#9eab93' }}>µg/m³</span>
                          {estimate.categoryInfo && (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: `${estimate.categoryInfo.color}25`,
                                color: estimate.categoryInfo.color,
                              }}
                            >
                              {estimate.categoryInfo.category}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontStyle: 'italic' }}>
                          Coverage Unavailable
                        </span>
                      )}
                    </div>

                    {/* Corridor Range & Confidence Details */}
                    {estimate.coverageStatus === 'VALID' && estimate.avgPm25 !== null ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          color: '#9eab93',
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(163, 181, 147, 0.1)',
                        }}
                      >
                        <span>
                          Corridor Range: {estimate.minPm25} – {estimate.maxPm25} µg/m³
                        </span>
                        <span>
                          Spatial coverage: {estimate.coveragePercentage}%
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: '#9eab93', marginTop: '4px' }}>
                        {estimate.statusMessage}
                      </div>
                    )}
                  </div>

                  {/* Plain Language Summary */}
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: isLowestPollution ? '#86efac' : isFastest ? '#7dd3fc' : '#c9d3bf',
                      marginTop: '10px',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '5px',
                    }}
                  >
                    <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{item.tradeOffSummary}</span>
                  </div>
                </div>
              );
            })}

          {/* Honest Trade-off & Data Governance Disclosure Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(22, 32, 21, 0.75) 0%, rgba(14, 20, 14, 0.9) 100%)',
              border: '1px solid rgba(163, 181, 147, 0.18)',
              borderRadius: '18px',
              padding: '1.25rem 1.4rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={15} color="#8fa07e" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#f4f6f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                How AirLens Estimates Route Exposure
              </h3>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#c9d3bf', lineHeight: 1.45 }}>
              Along each genuine road geometry, AirLens samples multiple coordinate points and evaluates
              ambient PM2.5 concentrations using <strong>Inverse Distance Weighting (IDW)</strong> from continuous monitoring stations.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.74rem',
                color: '#9eab93',
                background: 'rgba(10, 14, 10, 0.5)',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(163, 181, 147, 0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Underlying Data Timestamp:</span>
                <strong style={{ color: '#f4f6f0' }}>{formattedDataTimestamp}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Data Provenance:</span>
                <span style={{ color: '#a3b593', fontWeight: 600 }}>Model estimate (Spatial IDW)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Road Network:</span>
                <span style={{ color: '#a3b593' }}>OpenStreetMap OSRM Live Roadway</span>
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                color: '#9eab93',
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              * Note: These are model-derived ambient estimates to help compare macro corridors. Immediate roadside conditions can fluctuate due to hyper-local vehicle queues and terrain. These estimates do not constitute medical health assessments.
            </div>
          </div>
        </div>

        {/* Right Column: Full Leaflet Route Map */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '1.25rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: '620px',
          }}
        >
          {/* Map Header / Active Route Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Interactive Route Map
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f4f6f0' }}>
                {selectedRouteComparison
                  ? `${selectedRouteComparison.route.name} (${selectedRouteComparison.route.summary})`
                  : 'Road Corridor Navigation'}
              </div>
            </div>

            {selectedRouteComparison && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(143, 160, 126, 0.15)',
                    border: '1px solid rgba(163, 181, 147, 0.25)',
                    color: '#f4f6f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={13} color="#a3b593" />
                  <span>~{selectedRouteComparison.route.durationMinutes} mins</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <Navigation size={13} color="#a3b593" />
                  <span>{selectedRouteComparison.route.distanceKm} km</span>
                </span>
              </div>
            )}
          </div>

          {/* Leaflet Map Component */}
          <div style={{ flex: 1, minHeight: '520px', width: '100%' }}>
            <RouteMap
              startLocation={selectedStart}
              destinationLocation={selectedDest}
              routes={routeResults}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              stations={stations}
              stationObservations={stationObservations}
              showStations={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
