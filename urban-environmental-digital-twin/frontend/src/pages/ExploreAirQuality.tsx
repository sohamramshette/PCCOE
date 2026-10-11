import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  X,
  Layers,
  Activity,
  Info,
  RefreshCw,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getSpatialInterpolation } from '../api/spatial';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { InterpolatedGridPoint } from '../types/spatial';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import {
  evaluateAirQuality,
  getNAQICategoryInfo,
  calcPM25SubIndex,
} from '../utils/aqi';

export const ExploreAirQuality: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  // Sync selectedStationId with query parameter if present
  useEffect(() => {
    const stationParam = searchParams.get('station');
    if (stationParam) {
      const parsed = parseInt(stationParam, 10);
      if (!isNaN(parsed)) {
        setSelectedStationId(parsed);
      }
    }
  }, [searchParams]);

  const handleSelectStation = useCallback(
    (id: number | null) => {
      setSelectedStationId(id);
      if (id !== null) {
        setSearchParams({ station: id.toString() });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  const [stationObservations, setStationObservations] = useState<Record<number, ObservationItem | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Spatial heatmap layer state
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapPoints, setHeatmapPoints] = useState<InterpolatedGridPoint[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState<boolean>(false);

  // 1. Load Station Network & Latest Observations
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setLoadError(null);

      // Fetch active stations
      const stationList = await getStations(true);
      setStations(stationList);

      // Fetch latest observation for each station
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
      setLoadError('Unable to connect to air quality monitoring network. Please ensure backend services are running.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load heatmap when enabled
  useEffect(() => {
    if (showHeatmap && heatmapPoints.length === 0 && !isLoadingHeatmap) {
      setIsLoadingHeatmap(true);
      getSpatialInterpolation({ grid_step: 0.03 })
        .then((res) => {
          setHeatmapPoints(res.grid_points || []);
        })
        .catch(() => {
          // Heatmap fallback
        })
        .finally(() => {
          setIsLoadingHeatmap(false);
        });
    }
  }, [showHeatmap, heatmapPoints.length, isLoadingHeatmap]);

  // Selected station object
  const selectedStation = useMemo(() => {
    if (!selectedStationId) return null;
    return stations.find((s) => s.station_id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  // Selected station observation & evaluation
  const selectedObservation = useMemo(() => {
    if (!selectedStationId) return null;
    return stationObservations[selectedStationId] || null;
  }, [stationObservations, selectedStationId]);

  const selectedEvaluation = useMemo(() => {
    return evaluateAirQuality(selectedObservation);
  }, [selectedObservation]);

  // Filtered station list for search
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const query = searchQuery.toLowerCase();
    return stations.filter(
      (s) =>
        s.station_name.toLowerCase().includes(query) ||
        s.zone_type.toLowerCase().includes(query) ||
        s.city.toLowerCase().includes(query)
    );
  }, [stations, searchQuery]);

  // Network overview statistics when no station is selected
  const networkStats = useMemo(() => {
    const validObs = stations
      .map((s) => ({ station: s, obs: stationObservations[s.station_id] }))
      .filter((item) => item.obs && item.obs.pm25 !== null && item.obs.pm25 !== undefined);

    if (validObs.length === 0) {
      return { avgPm25: null, cleanest: null, highest: null };
    }

    const totalPm25 = validObs.reduce((sum, item) => sum + (item.obs!.pm25 || 0), 0);
    const avgPm25 = (totalPm25 / validObs.length).toFixed(1);

    const sorted = [...validObs].sort((a, b) => (a.obs!.pm25 || 0) - (b.obs!.pm25 || 0));
    const cleanest = sorted[0];
    const highest = sorted[sorted.length - 1];

    return { avgPm25, cleanest, highest };
  }, [stations, stationObservations]);

  // Format local timestamp
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Real-time feed';
    try {
      const dt = new Date(isoString);
      return dt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return 'Recent';
    }
  };

  // Pre-defined CPCB Legend Items
  const legendItems: { label: string; range: string; color: string; desc: string }[] = [
    { label: 'Good', range: '0–50', color: '#4ade80', desc: 'Minimal health impact' },
    { label: 'Satisfactory', range: '51–100', color: '#a3b593', desc: 'Acceptable for most people' },
    { label: 'Moderate', range: '101–200', color: '#facc15', desc: 'May cause breathing discomfort for sensitive groups' },
    { label: 'Poor', range: '201–300', color: '#fb923c', desc: 'Breathing discomfort on prolonged exposure' },
    { label: 'Very Poor', range: '301–400', color: '#f87171', desc: 'Respiratory illness on prolonged exposure' },
    { label: 'Severe', range: '401–500', color: '#ef4444', desc: 'Affects healthy individuals and serious effects on vulnerable groups' },
  ];

  if (isLoading && stations.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '420px',
          gap: '16px',
          color: '#166534',
        }}
      >
        <RefreshCw size={36} style={{ animation: 'spin 1.5s linear infinite' }} />
        <h3 style={{ margin: 0, color: '#0d1710', fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
          Loading Pollution Map...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#526b59' }}>
          Connecting to continuous monitoring stations across Pune &amp; Pimpri-Chinchwad
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Bar: Compact & Integrated */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '18px',
          padding: '1rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(40, 122, 69, 0.1)',
              border: '1px solid rgba(40, 122, 69, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#166534',
              flexShrink: 0,
            }}
          >
            <MapPin size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  margin: 0,
                  color: '#0d1710',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.01em',
                }}
              >
                Explore Air Quality
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(40, 122, 69, 0.1)',
                  color: '#166534',
                  border: '1px solid rgba(40, 122, 69, 0.25)',
                }}
              >
                Pune &amp; PCMC Air Twin
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#526b59' }}>
              Real-time ground station network and spatial particulate interpolation.
            </p>
          </div>
        </div>

        {/* Telemetry pill & refresh button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(240, 253, 244, 0.75)',
              border: '1px solid rgba(40, 122, 69, 0.2)',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.74rem',
              color: '#475e4e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isRefreshing ? '#facc15' : '#166534',
              }}
            />
            <span>{isRefreshing ? 'Syncing...' : `${stations.length || 6} Ground Stations Active`}</span>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              color: '#166534',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
            }}
            title="Refresh air quality readings"
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#dc2626',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
          }}
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadData}
            style={{
              background: 'none',
              border: '1px solid #dc2626',
              color: '#dc2626',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Sleek Filter & Search Toolbar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          boxShadow: '0 6px 20px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', minWidth: '220px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: '#ffffff',
              border: '1.5px solid rgba(40, 122, 69, 0.22)',
              borderRadius: '10px',
              padding: '0 10px',
            }}
          >
            <Search size={15} color="#166534" style={{ flexShrink: 0, marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search station or locality (e.g. Shivajinagar, Bhosari, Katraj)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#0f172a',
                fontSize: '0.84rem',
                padding: '8px 0',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                title="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Station Select Dropdown & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedStationId ?? ''}
            onChange={(e) => handleSelectStation(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1.5px solid rgba(40, 122, 69, 0.22)',
              color: '#0f172a',
              fontSize: '0.82rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Select Station to Inspect Outside Map --</option>
            {stations.map((st) => (
              <option key={st.station_id} value={st.station_id}>
                {st.station_name.split(',')[0]} ({st.city})
              </option>
            ))}
          </select>

          {selectedStationId !== null && (
            <button
              type="button"
              onClick={() => handleSelectStation(null)}
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                color: '#166534',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
              title="Clear station selection"
            >
              <X size={13} />
              <span>Deselect</span>
            </button>
          )}

          {/* Spatial Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              background: showHeatmap ? '#166534' : 'rgba(240, 253, 244, 0.85)',
              border: showHeatmap ? '1px solid #166534' : '1px solid rgba(40, 122, 69, 0.22)',
              color: showHeatmap ? '#ffffff' : '#166534',
              fontSize: '0.78rem',
              fontWeight: showHeatmap ? 700 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: showHeatmap ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
            }}
          >
            <Layers size={13} color={showHeatmap ? '#86efac' : '#166534'} />
            <span>{showHeatmap ? 'Heatmap: ON' : 'Spatial Heatmap'}</span>
            {isLoadingHeatmap && <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />}
          </button>
        </div>
      </div>

      {/* 3. Studio Workspace Grid: Map Studio (Left, Generous) + Outside-the-Map Station Inspector (Right) */}
      <div className="explore-air-studio-grid" style={{ marginBottom: '1.75rem' }}>
        {/* ========================================================= */}
        {/* LEFT COLUMN: Clear, Unobstructed Full-Height Map Studio   */}
        {/* ========================================================= */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '24px',
            padding: '1.25rem',
            boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Map Header Status Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={17} color="#166534" />
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  Interactive Pune Environmental Map
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#526b59' }}>
                  Click any monitoring station pin to inspect real-time measurements in the side inspector
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(40, 122, 69, 0.1)',
                  border: '1px solid rgba(40, 122, 69, 0.25)',
                  color: '#166534',
                }}
              >
                {filteredStations.length} of {stations.length} Stations
              </span>
            </div>
          </div>

          {/* Leaflet Map Canvas: High visibility, NO in-map popup */}
          <div
            style={{
              height: 'calc(100vh - 240px)',
              minHeight: '620px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(40, 122, 69, 0.2)',
              position: 'relative',
            }}
          >
            <PuneTwinMap
              stations={filteredStations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => handleSelectStation(id)}
              latestObservations={stationObservations}
              showTrafficBuffer={false}
              showActivityBuffer={false}
              showHeatmap={showHeatmap}
              heatmapGridPoints={heatmapPoints}
              disablePopup={true}
            />
          </div>

          {/* Docked Map Legend: Sleek horizontal bar */}
          <div
            style={{
              marginTop: '4px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'rgba(240, 253, 244, 0.75)',
              border: '1px solid rgba(40, 122, 69, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Info size={14} color="#166534" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.04em' }}>
                  Marker Colors: Particulate-Based Pollution Scale
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#526b59' }}>Standard CPCB Breakpoints (µg/m³)</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {legendItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${item.color}40`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  title={item.desc}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0d1710' }}>{item.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>({item.range})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Station Inspector Window (Outside the Map)  */}
        {/* ========================================================= */}
        <div
          style={{
            position: 'sticky',
            top: '1rem',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '24px',
            padding: '1.4rem',
            boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {selectedStation ? (
            /* STATE A: A Station IS Selected (Popup Window rendered OUTSIDE the map) */
            <>
              {/* Header: Station Name & Close Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: 'rgba(40, 122, 69, 0.1)',
                        color: '#166534',
                        border: '1px solid rgba(40, 122, 69, 0.2)',
                      }}
                    >
                      ID: {selectedStation.station_id}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: 'rgba(22, 101, 52, 0.1)',
                        color: '#15803d',
                        border: '1px solid rgba(22, 101, 52, 0.25)',
                      }}
                    >
                      ACTIVE
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background:
                          selectedObservation?.data_provenance === 'OBSERVED'
                            ? 'rgba(22, 101, 52, 0.1)'
                            : 'rgba(40, 122, 69, 0.08)',
                        color: selectedObservation?.data_provenance === 'OBSERVED' ? '#15803d' : '#166534',
                        border: '1px solid rgba(40, 122, 69, 0.2)',
                      }}
                    >
                      {selectedObservation?.data_provenance === 'OBSERVED' ? 'Measured' : 'Model Estimate'}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      margin: '4px 0 2px',
                      color: '#0d1710',
                      lineHeight: 1.25,
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {selectedStation.station_name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#526b59' }}>
                    {selectedStation.zone_type} · {selectedStation.city}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectStation(null)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    color: '#334155',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                  title="Close station inspector"
                  aria-label="Close station inspector"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Station Metadata 2x2 Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'rgba(240, 253, 244, 0.75)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '14px',
                  padding: '10px 12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#526b59', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={11} color="#166534" />
                    <span>Authority</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710', marginTop: '2px' }}>
                    {selectedStation.monitoring_authority}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#526b59', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={11} color="#166534" />
                    <span>Zoning</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedStation.zone_type.split('/')[0]}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#526b59' }}>Coordinates</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginTop: '2px', fontFamily: 'monospace' }}>
                    {selectedStation.latitude.toFixed(4)}° N, {selectedStation.longitude.toFixed(4)}° E
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#526b59' }}>Elevation</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {selectedStation.elevation_m !== null && selectedStation.elevation_m !== undefined
                      ? `${selectedStation.elevation_m} m`
                      : '560 m'}
                  </div>
                </div>
              </div>

              {/* Particulate-Based Air Index Card */}
              <div
                style={{
                  padding: '1.15rem 1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#526b59', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Particulate Air Index (Estimate)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                      <span
                        style={{
                          fontSize: '2.8rem',
                          fontWeight: 800,
                          color: selectedEvaluation.particulateColor || '#166534',
                          lineHeight: 1,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {selectedEvaluation.particulateIndex ?? '--'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>/ 500</span>
                    </div>
                  </div>

                  {selectedEvaluation.particulateCategory && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: `${selectedEvaluation.particulateColor}18`,
                        color: selectedEvaluation.particulateColor || '#15803d',
                        border: `1px solid ${selectedEvaluation.particulateColor}40`,
                      }}
                    >
                      {selectedEvaluation.particulateCategory}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                  {selectedEvaluation.hasParticulateEstimate
                    ? `Calculated from ${selectedEvaluation.prominentParticulate || 'PM2.5'} using CPCB scale`
                    : 'Telemetry data currently updating'}
                </div>

                {/* PM2.5 and PM10 Dual Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: 'rgba(240, 253, 244, 0.6)',
                      border: '1px solid rgba(40, 122, 69, 0.15)',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#526b59', textTransform: 'uppercase', fontWeight: 600 }}>
                      PM2.5 Fine Particles
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d1710', marginTop: '2px' }}>
                      {selectedObservation?.pm25 !== null && selectedObservation?.pm25 !== undefined
                        ? `${selectedObservation.pm25.toFixed(1)} µg/m³`
                        : 'Unavailable'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: 'rgba(240, 253, 244, 0.6)',
                      border: '1px solid rgba(40, 122, 69, 0.15)',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#526b59', textTransform: 'uppercase', fontWeight: 600 }}>
                      PM10 Coarse Dust
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d1710', marginTop: '2px' }}>
                      {selectedObservation?.pm10 !== null && selectedObservation?.pm10 !== undefined
                        ? `${selectedObservation.pm10.toFixed(1)} µg/m³`
                        : 'Not Monitored'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Official CPCB AQI Status Notice */}
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'rgba(240, 253, 244, 0.75)',
                  border: '1px solid rgba(40, 122, 69, 0.2)',
                  fontSize: '0.74rem',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  lineHeight: 1.35,
                }}
              >
                <Info size={14} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  {selectedEvaluation.isOfficialAqiAvailable ? (
                    <>
                      <strong style={{ color: '#0d1710' }}>Official CPCB NAQI:</strong> {selectedEvaluation.officialAqi} ({selectedEvaluation.officialCategory})
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#0d1710' }}>Official Overall CPCB AQI:</strong> Unavailable ({selectedEvaluation.officialUnavailableReason || 'Requires 3+ criteria pollutants over 24h'})
                    </>
                  )}
                </span>
              </div>

              {/* Resident Guidance Advisory Card */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(240, 253, 244, 0.85)',
                  borderLeft: `4px solid ${selectedEvaluation.particulateColor || '#166534'}`,
                  color: '#334155',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: '#166534' }}>Neighborhood Advisory:</strong>{' '}
                {selectedEvaluation.particulateExplanation ||
                  'Air quality is acceptable. Observation data is updating continuously.'}
              </div>

              {/* Action Buttons & Footer Timestamp */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const localityName = selectedStation.station_name.split(',')[0].trim();
                    navigate(`/cleaner-routes?dest=${encodeURIComponent(localityName)}`);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    border: '1px solid rgba(22, 101, 52, 0.4)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(22, 101, 52, 0.3)',
                  }}
                >
                  <Navigation size={13} />
                  <span>Plan Cleaner Route to Here</span>
                  <ArrowRight size={13} />
                </button>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    color: '#64748b',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(40, 122, 69, 0.15)',
                  }}
                >
                  <span>Sensor Feed: Live</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
                    <Clock size={11} />
                    <span>{formatTime(selectedObservation?.datetime_local_ist || selectedObservation?.datetime_utc)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* STATE B: No Station Selected (Pune Air Network Overview) */
            <>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Activity size={14} color="#166534" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Network Overview
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    margin: '0 0 4px',
                    color: '#0d1710',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  Pune Air Quality Network
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#526b59', lineHeight: 1.4 }}>
                  Select any station on the map or from the list below to inspect localized telemetry outside the map.
                </p>
              </div>

              {/* Network Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(240, 253, 244, 0.75)',
                    border: '1px solid rgba(40, 122, 69, 0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', color: '#526b59', fontWeight: 600 }}>City Average PM2.5</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                      {networkStats.avgPm25 ?? '--'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>µg/m³</span>
                  </div>
                </div>

                {networkStats.cleanest && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(240, 253, 244, 0.75)',
                      border: '1px solid rgba(40, 122, 69, 0.18)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>
                        Cleanest Monitored Locality
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1710', marginTop: '2px' }}>
                        {networkStats.cleanest.station.station_name.split(',')[0]}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d' }}>
                      {networkStats.cleanest.obs?.pm25?.toFixed(1)} µg/m³
                    </span>
                  </div>
                )}
              </div>

              {/* Station Quick Selector Cards */}
              <div>
                <div style={{ fontSize: '0.74rem', color: '#526b59', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Monitoring Stations ({stations.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {stations.map((st) => {
                    const obs = stationObservations[st.station_id];
                    const pm25 = obs?.pm25;
                    const subAqi = calcPM25SubIndex(pm25);
                    const catInfo = subAqi !== null ? getNAQICategoryInfo(subAqi) : null;

                    return (
                      <div
                        key={st.station_id}
                        onClick={() => handleSelectStation(st.station_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(40, 122, 69, 0.18)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: catInfo?.color || '#166534',
                              }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0d1710' }}>
                              {st.station_name.split(',')[0]}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                            {st.zone_type.split('/')[0]}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: catInfo?.color || '#0d1710' }}>
                            {pm25 !== null && pm25 !== undefined ? `${pm25.toFixed(1)}` : '--'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '3px' }}>µg/m³</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Helpful Hint Pill */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(240, 253, 244, 0.8)',
                  border: '1px dashed rgba(40, 122, 69, 0.3)',
                  fontSize: '0.74rem',
                  color: '#475e4e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={15} color="#166534" style={{ flexShrink: 0 }} />
                <span>Click any station marker on the map to inspect full telemetry in this panel.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Full Neighborhood Comparison Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#166534" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                Neighborhood Air Quality Comparison
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#526b59', marginTop: '2px' }}>
              Compare current particulate levels across Pune and Pimpri-Chinchwad monitoring stations
            </div>
          </div>

          <span style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 600 }}>
            Click any row to focus and inspect in the side inspector
          </span>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.84rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(40, 122, 69, 0.2)',
                  color: '#526b59',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '10px 12px' }}>Locality / Station</th>
                <th style={{ padding: '10px 12px' }}>Area Type</th>
                <th style={{ padding: '10px 12px' }}>PM2.5 (µg/m³)</th>
                <th style={{ padding: '10px 12px' }}>PM10 (µg/m³)</th>
                <th style={{ padding: '10px 12px' }}>Particulate Tier</th>
                <th style={{ padding: '10px 12px' }}>Data Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((st) => {
                const obs = stationObservations[st.station_id];
                const pm25Val = obs?.pm25;
                const pm10Val = obs?.pm10;
                const subAqi = calcPM25SubIndex(pm25Val);
                const catInfo = subAqi !== null ? getNAQICategoryInfo(subAqi) : null;
                const isSelected = st.station_id === selectedStationId;

                return (
                  <tr
                    key={st.station_id}
                    style={{
                      borderBottom: '1px solid rgba(40, 122, 69, 0.12)',
                      background: isSelected ? 'rgba(240, 253, 244, 0.85)' : 'transparent',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSelectStation(st.station_id)}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0d1710' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: catInfo?.color || '#166534',
                          }}
                        />
                        <span>{st.station_name.split(',')[0]}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{st.city}</div>
                    </td>

                    <td style={{ padding: '12px', color: '#334155', fontSize: '0.78rem' }}>
                      {st.zone_type.split('/')[0]}
                    </td>

                    <td style={{ padding: '12px', fontWeight: 700, color: '#0d1710' }}>
                      {pm25Val !== null && pm25Val !== undefined ? `${pm25Val.toFixed(1)}` : 'Unavailable'}
                    </td>

                    <td style={{ padding: '12px', color: '#334155' }}>
                      {pm10Val !== null && pm10Val !== undefined ? `${pm10Val.toFixed(1)}` : 'Not monitored'}
                    </td>

                    <td style={{ padding: '12px' }}>
                      {catInfo ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: `${catInfo.color}18`,
                            color: catInfo.color,
                            border: `1px solid ${catInfo.color}40`,
                          }}
                        >
                          {catInfo.category} ({subAqi})
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Awaiting data</span>
                      )}
                    </td>

                    <td style={{ padding: '12px', fontSize: '0.76rem', color: '#526b59' }}>
                      {obs?.data_provenance === 'OBSERVED' ? 'Measured' : 'Model'}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStation(isSelected ? null : st.station_id);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: isSelected ? '#166534' : 'rgba(255, 255, 255, 0.95)',
                          border: isSelected ? '1px solid #166534' : '1px solid rgba(40, 122, 69, 0.25)',
                          color: isSelected ? '#ffffff' : '#166534',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        {isSelected ? 'Selected' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
