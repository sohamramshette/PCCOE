import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Search,
  X,
  Layers,
  Activity,
  Info,
  RefreshCw,
  Clock,
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
  const [searchParams] = useSearchParams();
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
          color: '#a3b593',
        }}
      >
        <RefreshCw size={36} style={{ animation: 'spin 1.5s linear infinite' }} />
        <h3 style={{ margin: 0, color: '#f4f6f0', fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
          Loading Pollution Map...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#9eab93' }}>
          Connecting to continuous monitoring stations across Pune &amp; Pimpri-Chinchwad
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Page Introduction Banner */}
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
              <MapPin size={13} />
              Explore Air Quality
            </span>
            <span style={{ fontSize: '11px', color: '#9eab93' }}>Pune &amp; Pimpri-Chinchwad Localities</span>
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
            Explore Pollution Levels Across Pune
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#c9d3bf', maxWidth: '750px', lineHeight: 1.5 }}>
            Interactive neighborhood pollution map. Click on any monitoring station marker or search below to inspect
            local air quality, particulate concentrations, and data provenance.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(143, 160, 126, 0.12)',
              border: '1px solid rgba(163, 181, 147, 0.28)',
              color: '#f4f6f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Refresh air quality readings"
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Readings'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadData}
            style={{
              background: 'none',
              border: '1px solid #fca5a5',
              color: '#fca5a5',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Locality Search & Selector Controls */}
      <div
        style={{
          background: 'rgba(23, 33, 21, 0.72)',
          border: '1px solid rgba(163, 181, 147, 0.2)',
          borderRadius: '18px',
          padding: '1.15rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', minWidth: '240px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(14, 20, 14, 0.8)',
              border: '1px solid rgba(163, 181, 147, 0.25)',
              borderRadius: '12px',
              padding: '0 12px',
            }}
          >
            <Search size={16} color="#9eab93" style={{ flexShrink: 0, marginRight: '8px' }} />
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
                color: '#f4f6f0',
                fontSize: '0.86rem',
                padding: '9px 0',
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
                  color: '#9eab93',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Station Select Dropdown & View Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedStationId ?? ''}
            onChange={(e) => setSelectedStationId(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              background: 'rgba(14, 20, 14, 0.85)',
              border: '1px solid rgba(163, 181, 147, 0.3)',
              color: '#f4f6f0',
              fontSize: '0.84rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- All Pune Stations (Overview) --</option>
            {stations.map((st) => (
              <option key={st.station_id} value={st.station_id}>
                {st.station_name.split(',')[0]} ({st.city})
              </option>
            ))}
          </select>

          {selectedStationId !== null && (
            <button
              type="button"
              onClick={() => setSelectedStationId(null)}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(143, 160, 126, 0.14)',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                color: '#c9d3bf',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <X size={14} />
              <span>Reset Map View</span>
            </button>
          )}

          {/* Spatial Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              background: showHeatmap ? 'rgba(74, 222, 128, 0.18)' : 'rgba(20, 28, 19, 0.65)',
              border: showHeatmap ? '1.5px solid #4ade80' : '1px solid rgba(163, 181, 147, 0.25)',
              color: showHeatmap ? '#ffffff' : '#a3b593',
              fontSize: '0.82rem',
              fontWeight: showHeatmap ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Layers size={14} color={showHeatmap ? '#4ade80' : '#a3b593'} />
            <span>{showHeatmap ? 'Heatmap: ON' : 'Spatial Heatmap'}</span>
            {isLoadingHeatmap && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          </button>
        </div>
      </div>

      {/* Main Map & Selected Location Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedStationId ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
          gap: '1.75rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Map Container */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#8fa07e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Interactive Pune Environmental Map
              </h2>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#9eab93' }}>
              {stations.length} Active Monitoring Stations · PMC &amp; PCMC
            </span>
          </div>

          {/* Leaflet Map */}
          <div
            style={{
              height: selectedStationId ? '460px' : '520px',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid rgba(163, 181, 147, 0.2)',
              position: 'relative',
            }}
          >
            <PuneTwinMap
              stations={filteredStations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => setSelectedStationId(id)}
              latestObservations={stationObservations}
              showTrafficBuffer={false}
              showActivityBuffer={false}
              showHeatmap={showHeatmap}
              heatmapGridPoints={heatmapPoints}
            />
          </div>

          {/* Simple Map Legend */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(163, 181, 147, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Info size={14} color="#8fa07e" />
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: '#a3b593', letterSpacing: '0.04em' }}>
                Map Marker Colors: Particulate-Based Pollution Estimate
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {legendItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: 'rgba(14, 20, 14, 0.65)',
                    border: `1px solid ${item.color}35`,
                  }}
                  title={item.desc}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#f4f6f0' }}>{item.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#9eab93' }}>({item.range})</span>
                </div>
              ))}
            </div>

            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#9eab93', lineHeight: 1.4 }}>
              * Colored indicators represent particulate-based pollution estimates (PM2.5/PM10) evaluated against standard CPCB breakpoints. They are not the official overall CPCB AQI (which requires a minimum of 3 criteria pollutants including PM2.5 or PM10 over a 24-hour averaging period). Where stations are undergoing routine calibration or telemetry updates, markers show gray.
            </p>
          </div>
        </div>

        {/* Selected Station Details Panel */}
        {selectedStation && (
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
              border: '1px solid rgba(163, 181, 147, 0.22)',
              borderRadius: '24px',
              padding: '1.75rem',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Header: Station & Close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background:
                          selectedObservation?.data_provenance === 'OBSERVED'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(143, 160, 126, 0.18)',
                        color: selectedObservation?.data_provenance === 'OBSERVED' ? '#4ade80' : '#a3b593',
                        border: '1px solid rgba(163, 181, 147, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: selectedObservation?.data_provenance === 'OBSERVED' ? '#4ade80' : '#a3b593',
                        }}
                      />
                      {selectedObservation?.data_provenance === 'OBSERVED' ? 'Measured reading' : 'Model estimate'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9eab93' }}>
                      {selectedObservation?.data_provenance === 'OBSERVED'
                        ? 'Direct sensor reading'
                        : 'Spatial model estimate'}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '2px 0 0', color: '#f4f6f0' }}>
                    {selectedStation.station_name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#9eab93' }}>
                    {selectedStation.zone_type} · {selectedStation.city}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStationId(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#9eab93',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                  }}
                  title="Close station details"
                  aria-label="Close station details"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Official CPCB AQI Status Banner */}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: selectedEvaluation.isOfficialAqiAvailable
                    ? 'rgba(74, 222, 128, 0.1)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(163, 181, 147, 0.16)',
                  marginBottom: '1rem',
                  fontSize: '0.76rem',
                  color: '#c9d3bf',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Info size={14} color="#a3b593" style={{ flexShrink: 0 }} />
                <span>
                  {selectedEvaluation.isOfficialAqiAvailable ? (
                    <>
                      <strong>Official CPCB NAQI:</strong> {selectedEvaluation.officialAqi} ({selectedEvaluation.officialCategory}) — Prominent: {selectedEvaluation.prominentPollutant}
                    </>
                  ) : (
                    <>
                      <strong>Official Overall CPCB AQI:</strong> Unavailable ({selectedEvaluation.officialUnavailableReason})
                    </>
                  )}
                </span>
              </div>

              {/* Particulate Index Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  borderRadius: '18px',
                  background: 'rgba(14, 20, 14, 0.72)',
                  border: '1px solid rgba(163, 181, 147, 0.18)',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#9eab93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Particulate-Based Air Index (Estimate)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '3.2rem',
                        fontWeight: 800,
                        color: selectedEvaluation.particulateColor || '#a3b593',
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {selectedEvaluation.particulateIndex ?? '--'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#9eab93', fontWeight: 600 }}>/ 500</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9eab93', marginTop: '4px' }}>
                    {selectedEvaluation.hasParticulateEstimate
                      ? `Calculated from ${selectedEvaluation.prominentParticulate} using CPCB scale`
                      : 'Telemetry data currently updating'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#9eab93', textTransform: 'uppercase' }}>PM2.5 Fine Particles</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f6f0' }}>
                      {selectedObservation?.pm25 !== null && selectedObservation?.pm25 !== undefined
                        ? `${selectedObservation.pm25.toFixed(1)} µg/m³`
                        : 'Unavailable'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#9eab93', textTransform: 'uppercase' }}>PM10 Coarse Dust</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f6f0' }}>
                      {selectedObservation?.pm10 !== null && selectedObservation?.pm10 !== undefined
                        ? `${selectedObservation.pm10.toFixed(1)} µg/m³`
                        : 'Not monitored'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resident Guidance */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(143, 160, 126, 0.1)',
                  borderLeft: `4px solid ${selectedEvaluation.particulateColor || '#a3b593'}`,
                  color: '#eef1e7',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  marginBottom: '1rem',
                }}
              >
                <strong>Neighborhood Advisory:</strong>{' '}
                {selectedEvaluation.particulateExplanation ||
                  'Observation data is currently updating for this station.'}
              </div>
            </div>

            {/* Footer Metadata */}
            <div
              style={{
                paddingTop: '0.9rem',
                borderTop: '1px solid rgba(163, 181, 147, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#9eab93',
              }}
            >
              <span>Monitoring Authority: {selectedStation.monitoring_authority}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a3b593', fontWeight: 600 }}>
                <Clock size={12} />
                <span>{formatTime(selectedObservation?.datetime_local_ist || selectedObservation?.datetime_utc)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison of Monitored Localities Across Pune */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#8fa07e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Neighborhood Air Quality Comparison
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9eab93', marginTop: '2px' }}>
              Compare current particulate levels across Pune and Pimpri-Chinchwad monitoring stations
            </div>
          </div>

          <span style={{ fontSize: '0.76rem', color: '#a3b593' }}>
            Click any station to focus on the map
          </span>
        </div>

        {/* Responsive Table / Cards */}
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
                  borderBottom: '1px solid rgba(163, 181, 147, 0.2)',
                  color: '#9eab93',
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
                      borderBottom: '1px solid rgba(163, 181, 147, 0.1)',
                      background: isSelected ? 'rgba(143, 160, 126, 0.12)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: '#f4f6f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: catInfo?.color || '#a3b593',
                          }}
                        />
                        <span>{st.station_name.split(',')[0]}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9eab93', marginTop: '1px' }}>{st.city}</div>
                    </td>

                    <td style={{ padding: '12px', color: '#c9d3bf', fontSize: '0.78rem' }}>
                      {st.zone_type.split('/')[0]}
                    </td>

                    <td style={{ padding: '12px', fontWeight: 700, color: '#f4f6f0' }}>
                      {pm25Val !== null && pm25Val !== undefined ? `${pm25Val.toFixed(1)}` : 'Unavailable'}
                    </td>

                    <td style={{ padding: '12px', color: '#c9d3bf' }}>
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
                            backgroundColor: `${catInfo.color}20`,
                            color: catInfo.color,
                            border: `1px solid ${catInfo.color}50`,
                          }}
                        >
                          {catInfo.category} ({subAqi})
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#9eab93' }}>Awaiting data</span>
                      )}
                    </td>

                    <td style={{ padding: '12px', fontSize: '0.76rem', color: '#a3b593' }}>
                      {obs?.data_provenance === 'OBSERVED' ? 'Measured' : 'Model'}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStationId(st.station_id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(74, 222, 128, 0.2)' : 'rgba(143, 160, 126, 0.12)',
                          border: isSelected ? '1px solid #4ade80' : '1px solid rgba(163, 181, 147, 0.25)',
                          color: isSelected ? '#ffffff' : '#c9d3bf',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
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
