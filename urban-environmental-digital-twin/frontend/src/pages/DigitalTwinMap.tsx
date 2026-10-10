import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Flame,
  Crosshair,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  ArrowRight,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getSpatialInterpolation, interpolateCoordinate } from '../api/spatial';
import { triggerOpenAQSync } from '../api/sync';
import { getActiveAlerts } from '../api/alerts';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { AlertItem } from '../types/alert';
import { InterpolatedGridPoint, CoordinateInterpolationResponse } from '../types/spatial';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import { MapLegend } from '../components/map/MapLegend';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { formatNumber } from '../utils/formatters';

interface AtmosphericEpisode {
  id: string;
  name: string;
  badge: string;
  color: string;
  timestamp?: string;
  description: string;
  seasonTag: string;
  isLive?: boolean;
}

const ATMOSPHERIC_EPISODES: AtmosphericEpisode[] = [
  {
    id: 'live_telemetry',
    name: 'Live Telemetry Stream',
    badge: 'LIVE AUTO-SYNC',
    color: '#2563eb',
    timestamp: undefined,
    description: 'Active real-time telemetry stream ingesting live CPCB / IITM SAFAR telemetry via OpenAQ API v3.',
    seasonTag: 'Continuous Real-Time Stream · Auto-Renew Active',
    isLive: true,
  },
  {
    id: 'monsoon_clean',
    name: 'Post-Monsoon Clean',
    badge: 'GOOD / SATISFACTORY',
    color: '#059669',
    timestamp: undefined,
    description: 'Monsoon precipitation scavenging has washed particulate matter out of the troposphere.',
    seasonTag: 'Sep 2026 · Post-Monsoon Clean Air'
  },
  {
    id: 'winter_moderate',
    name: 'Winter Traffic Morning',
    badge: 'MODERATE / POOR',
    color: '#ca8a04',
    timestamp: '2026-01-06T07:00:00Z',
    description: 'Morning commute emissions under moderate winter cooling.',
    seasonTag: 'Jan 06, 2026 · Morning Commute Peak'
  },
  {
    id: 'winter_smog',
    name: 'Winter Smog Inversion',
    badge: 'VERY POOR / SEVERE',
    color: '#dc2626',
    timestamp: '2025-12-26T16:00:00Z',
    description: 'Ground-level thermal inversion traps vehicular & industrial emissions.',
    seasonTag: 'Dec 26, 2025 · Winter Inversion Smog'
  }
];

export const DigitalTwinMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [latestObservations, setLatestObservations] = useState<Record<number, ObservationItem | null>>({});
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('live_telemetry');
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  
  // Layer controls
  const [showTrafficBuffer, setShowTrafficBuffer] = useState<boolean>(true);
  const [showActivityBuffer, setShowActivityBuffer] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [idwPower, setIdwPower] = useState<number>(2.0);

  // IDW Heatmap state
  const [heatmapGrid, setHeatmapGrid] = useState<InterpolatedGridPoint[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);

  // Custom click inspection state
  const [customInspection, setCustomInspection] = useState<CoordinateInterpolationResponse | null>(null);
  const [inspectingCoord, setInspectingCoord] = useState<boolean>(false);

  // HackMatrix 5.0 Addition 2: Sensor Outage Simulation state
  const [outageStationIds, setOutageStationIds] = useState<number[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentEpisode = useMemo(
    () => ATMOSPHERIC_EPISODES.find((e) => e.id === selectedEpisodeId) || ATMOSPHERIC_EPISODES[0],
    [selectedEpisodeId]
  );

  const alertsByStation = useMemo(() => {
    const map: Record<number, AlertItem[]> = {};
    activeAlerts.forEach((a) => {
      if (!map[a.station_id]) map[a.station_id] = [];
      map[a.station_id].push(a);
    });
    return map;
  }, [activeAlerts]);

  const loadHeatmap = useCallback(async (power: number, targetTimestamp?: string) => {
    try {
      setHeatmapLoading(true);
      const data = await getSpatialInterpolation({
        power,
        ...(targetTimestamp ? { timestamp: targetTimestamp } : {}),
      });
      setHeatmapGrid(data.grid_points || []);
    } catch (err) {
      console.error('Failed to load spatial interpolation heatmap:', err);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  const refreshStationReadings = async (stationList: Station[], targetTimestamp?: string) => {
    const obsMap: Record<number, ObservationItem | null> = {};
    await Promise.all([
      ...stationList.map(async (st) => {
        try {
          const obsRes = await getObservations(st.station_id, {
            limit: 1,
            order: 'desc',
            valid_pm25_only: true,
            ...(targetTimestamp ? { end: targetTimestamp } : {})
          });
          obsMap[st.station_id] = obsRes.items.length > 0 ? obsRes.items[0] : null;
        } catch {
          obsMap[st.station_id] = null;
        }
      }),
      (async () => {
        try {
          const freshAlerts = await getActiveAlerts();
          setActiveAlerts(freshAlerts || []);
        } catch {
          // ignore background alert fetch error
        }
      })()
    ]);
    setLatestObservations(obsMap);
  };

  const loadData = async (episodeId: string = selectedEpisodeId) => {
    try {
      setLoading(true);
      setError(null);

      const stationList = await getStations(true);
      setStations(stationList);

      if (stationList.length > 0 && selectedStationId === null) {
        setSelectedStationId(stationList[0].station_id);
      }

      const ep = ATMOSPHERIC_EPISODES.find((e) => e.id === episodeId) || ATMOSPHERIC_EPISODES[0];
      await refreshStationReadings(stationList, ep.timestamp);
      await loadHeatmap(idwPower, ep.timestamp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load spatial digital twin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleForceLiveSync = async () => {
    try {
      setIsSyncingLive(true);
      await triggerOpenAQSync();
      const currentStations = stations.length > 0 ? stations : await getStations(true);
      await refreshStationReadings(currentStations, undefined);
      await loadHeatmap(idwPower, undefined);
      setCountdown(30);
    } catch (err) {
      console.error('Manual live sync failed:', err);
    } finally {
      setIsSyncingLive(false);
    }
  };

  // Real-Time Auto-Renew & Countdown Effect
  useEffect(() => {
    if (!currentEpisode.isLive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          (async () => {
            try {
              setIsSyncingLive(true);
              const currentStations = stations.length > 0 ? stations : await getStations(true);
              await refreshStationReadings(currentStations, undefined);
              await loadHeatmap(idwPower, undefined);
            } catch (e) {
              console.error('Auto-renew telemetry error:', e);
            } finally {
              setIsSyncingLive(false);
            }
          })();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedEpisodeId, stations, idwPower, loadHeatmap, currentEpisode.isLive]);

  const handleMapClick = async (lat: number, lon: number) => {
    try {
      setInspectingCoord(true);
      const res = await interpolateCoordinate(lat, lon, idwPower, currentEpisode.timestamp);
      setCustomInspection(res);
    } catch (err) {
      console.error('Coordinate interpolation failed:', err);
    } finally {
      setInspectingCoord(false);
    }
  };

  const handlePowerChange = (newPower: number) => {
    setIdwPower(newPower);
    loadHeatmap(newPower, currentEpisode.timestamp);
  };

  const handleEpisodeChange = async (episodeId: string) => {
    setSelectedEpisodeId(episodeId);
    setCustomInspection(null);
    setCountdown(30);
    const ep = ATMOSPHERIC_EPISODES.find((e) => e.id === episodeId) || ATMOSPHERIC_EPISODES[0];
    
    if (ep.isLive) {
      handleForceLiveSync();
      return;
    }

    await loadHeatmap(idwPower, ep.timestamp);
    const currentStations = stations.length > 0 ? stations : await getStations(true);
    await refreshStationReadings(currentStations, ep.timestamp);
  };

  const toggleStationOutage = (stationId: number) => {
    setOutageStationIds((prev) => {
      if (prev.includes(stationId)) {
        return prev.filter((id) => id !== stationId);
      } else {
        return [...prev, stationId];
      }
    });
  };

  const applyOutagePreset = (preset: 'none' | 'withheld' | '50pct' | '100pct') => {
    if (preset === 'none') {
      setOutageStationIds([]);
    } else if (preset === 'withheld') {
      setOutageStationIds([11613]);
    } else if (preset === '50pct') {
      const halfCount = Math.ceil(stations.length / 2);
      setOutageStationIds(stations.slice(0, halfCount).map((s) => s.station_id));
    } else if (preset === '100pct') {
      setOutageStationIds(stations.map((s) => s.station_id));
    }
  };

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* 1. Sleek Control Room HUD Header Bar */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.16)',
          borderRadius: '16px',
          padding: '0.85rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
        }}
      >
        {/* Left: Title + Key Metrics Pill Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
              Pune Digital Twin
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#475e4e', margin: 0, fontWeight: 500 }}>
              Spatial continuous air quality interpolation &amp; live environmental telemetry
            </p>
          </div>

          {/* Quick HUD Metrics Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '7px',
                background: 'rgba(40, 122, 69, 0.1)',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                fontSize: '0.74rem',
                color: '#166534',
                fontWeight: 600,
              }}
            >
              <MapPin size={12} color="#166534" /> {stations.length || 6} CAAQMN Stations
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '7px',
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                fontSize: '0.74rem',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <Flame size={12} color="#0284c7" /> {heatmapGrid.length || 289} IDW Grid Cells
            </span>
          </div>
        </div>

        {/* Center / Right: Atmospheric Scenario Pills & Sync Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Scenario Selector Pills */}
          <div
            style={{
              display: 'flex',
              gap: '3px',
              background: 'rgba(241, 245, 249, 0.95)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(40, 122, 69, 0.18)',
            }}
          >
            {ATMOSPHERIC_EPISODES.map((ep) => {
              const isSelected = ep.id === selectedEpisodeId;
              return (
                <button
                  key={ep.id}
                  onClick={() => handleEpisodeChange(ep.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 9px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid rgba(40, 122, 69, 0.3)' : '1px solid transparent',
                    backgroundColor: isSelected ? (ep.isLive ? 'rgba(37, 99, 235, 0.15)' : `${ep.color}25`) : 'transparent',
                    color: isSelected ? (ep.isLive ? '#1d4ed8' : '#0d1710') : '#475569',
                    boxShadow: isSelected ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title={ep.description}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ep.color }} />
                  <span>{ep.name.split('/')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Live Sync Status & Button */}
          {currentEpisode.isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    boxShadow: '0 0 6px #16a34a',
                  }}
                />
                <span>{countdown}s</span>
              </span>
              <button
                onClick={handleForceLiveSync}
                disabled={isSyncingLive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '7px',
                  border: '1px solid rgba(22, 101, 52, 0.35)',
                  backgroundColor: 'rgba(22, 101, 52, 0.1)',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: isSyncingLive ? 'not-allowed' : 'pointer',
                }}
                title="Force instant sync from OpenAQ"
              >
                <RefreshCw size={11} className={isSyncingLive ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Spatial Twin Command Center Grid */}
      {loading ? (
        <LoadingSpinner message="Loading spatial twin geometry and monitoring network..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadData} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 360px',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Interactive Map Deck */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Map Top Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(40, 122, 69, 0.18)',
                borderBottom: 'none',
                borderRadius: '14px 14px 0 0',
                fontSize: '11px',
                gap: '8px',
                flexWrap: 'wrap',
                boxShadow: '0 4px 14px rgba(22, 38, 25, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setSelectedStationId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: selectedStationId === null ? '#0284c7' : 'rgba(40, 122, 69, 0.22)',
                    backgroundColor: selectedStationId === null ? 'rgba(2, 132, 199, 0.12)' : '#ffffff',
                    color: selectedStationId === null ? '#0284c7' : '#334155',
                    fontWeight: 650,
                    cursor: 'pointer',
                    fontSize: '11px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  title="Fit camera to view all 6 monitoring stations"
                >
                  <MapPin size={12} color={selectedStationId === null ? '#0284c7' : '#475569'} />
                  <span>Fit All Stations</span>
                </button>

                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: showHeatmap ? '#ea580c' : 'rgba(40, 122, 69, 0.22)',
                    backgroundColor: showHeatmap ? 'rgba(234, 88, 12, 0.12)' : '#ffffff',
                    color: showHeatmap ? '#c2410c' : '#334155',
                    fontWeight: 650,
                    cursor: 'pointer',
                    fontSize: '11px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  title="Toggle continuous PM2.5 IDW spatial interpolation heatmap"
                >
                  <Flame size={12} color={showHeatmap ? '#ea580c' : '#475569'} />
                  <span>IDW Heatmap ({showHeatmap ? 'ON' : 'OFF'})</span>
                </button>

                {showHeatmap && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#475569', fontSize: '10.5px', fontWeight: 600 }}>Power:</span>
                    {[1.5, 2.0, 3.0].map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePowerChange(p)}
                        style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          border: '1px solid',
                          borderColor: idwPower === p ? '#0284c7' : 'rgba(40, 122, 69, 0.2)',
                          backgroundColor: idwPower === p ? 'rgba(2, 132, 199, 0.15)' : '#ffffff',
                          color: idwPower === p ? '#0369a1' : '#475569',
                          fontSize: '10.5px',
                          fontWeight: idwPower === p ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {p.toFixed(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '11px' }}>
                {heatmapLoading && <span style={{ color: '#ea580c', fontWeight: 600 }}>Calculating IDW...</span>}
                {inspectingCoord && <span style={{ color: '#0284c7', fontWeight: 600 }}>Estimating...</span>}
                <Crosshair size={12} style={{ color: '#0284c7' }} />
                <span style={{ color: '#166534', fontWeight: 600 }}>Click map to interpolate coordinate</span>
                {customInspection && (
                  <button
                    onClick={() => setCustomInspection(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      border: '1px solid rgba(40, 122, 69, 0.25)',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={9} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Map Frame (Hero Height, Directly Visible) */}
            <div
              className="card map-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '0 0 14px 14px',
                borderTop: 'none',
                height: 'calc(100vh - 215px)',
                minHeight: '560px',
              }}
            >
              <PuneTwinMap
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
                latestObservations={latestObservations}
                alertsByStation={alertsByStation}
                outageStationIds={outageStationIds}
                showTrafficBuffer={showTrafficBuffer}
                showActivityBuffer={showActivityBuffer}
                showHeatmap={showHeatmap}
                heatmapGridPoints={heatmapGrid}
                customInspectionResult={customInspection}
                onMapClickCoordinate={handleMapClick}
                onClearCustomInspection={() => setCustomInspection(null)}
              />

              <div className="map-legend-overlay">
                <MapLegend
                  showTrafficBuffer={showTrafficBuffer}
                  showActivityBuffer={showActivityBuffer}
                  onToggleTrafficBuffer={setShowTrafficBuffer}
                  onToggleActivityBuffer={setShowActivityBuffer}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Station Roster & Diagnostics Deck */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: 'calc(100vh - 165px)',
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {/* 1. Pinpoint Coordinate Inspection Card (if active) */}
            {customInspection && (
              <div
                className="card"
                style={{
                  padding: '1rem',
                  border: `1.5px solid ${customInspection.color}`,
                  background: 'rgba(255, 255, 255, 0.92)',
                  borderRadius: '16px',
                  boxShadow: '0 6px 20px rgba(22, 38, 25, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Crosshair size={14} style={{ color: customInspection.color }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d1710' }}>
                      Pinpoint Interpolation
                    </span>
                  </div>
                  <button
                    onClick={() => setCustomInspection(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: customInspection.color }}>
                    {customInspection.interpolated_pm25}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>µg/m³</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: `${customInspection.color}25`,
                      color: customInspection.color,
                      border: `1px solid ${customInspection.color}60`,
                    }}
                  >
                    {customInspection.aqi_category}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.5rem' }}>
                  Nearest: <strong style={{ color: '#0d1710' }}>{customInspection.nearest_station_name}</strong> ({customInspection.distance_to_nearest_km} km)
                  <span style={{ marginLeft: '6px', color: '#166534', fontWeight: 700 }}>
                    • {Math.round(customInspection.confidence_score * 100)}% confidence
                  </span>
                </div>

                <div style={{ borderTop: '1px solid rgba(40, 122, 69, 0.15)', paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Sensor Attribution Weights:
                  </div>
                  {customInspection.contributing_stations.slice(0, 3).map((st) => (
                    <div key={st.station_id} style={{ fontSize: '0.7rem', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>{st.station_name.split(',')[0]} ({st.distance_km} km)</span>
                        <span style={{ fontWeight: 700, color: '#0d1710' }}>{st.weight_percentage}%</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${st.weight_percentage}%`, backgroundColor: '#0284c7' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Sensor Outage Simulator (Addition 2) Card */}
            <div
              className="card"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: `1px solid ${outageStationIds.length > 0 ? '#f59e0b' : 'rgba(40, 122, 69, 0.16)'}`,
                borderRadius: '16px',
                padding: '0.9rem 1.1rem',
                boxShadow: '0 6px 20px rgba(22, 38, 25, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '0.82rem', color: '#0d1710' }}>
                  <WifiOff size={14} color={outageStationIds.length > 0 ? '#d97706' : '#287a45'} />
                  <span>Sensor Outage Simulator</span>
                </div>
                {outageStationIds.length > 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid rgba(180, 83, 9, 0.3)',
                      fontWeight: 700,
                    }}
                  >
                    {outageStationIds.length} OFFLINE
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {[
                  { label: '0% Live', preset: 'none' as const, active: outageStationIds.length === 0 },
                  { label: 'Withheld #11613', preset: 'withheld' as const, active: outageStationIds.length === 1 && outageStationIds.includes(11613) },
                  { label: '50% Loss', preset: '50pct' as const, active: outageStationIds.length === Math.ceil(stations.length / 2) },
                  { label: '100% Blackout', preset: '100pct' as const, active: outageStationIds.length === stations.length && stations.length > 0 },
                ].map((btn) => (
                  <button
                    key={btn.preset}
                    onClick={() => applyOutagePreset(btn.preset)}
                    style={{
                      flex: '1 1 70px',
                      padding: '5px 7px',
                      fontSize: '10.5px',
                      borderRadius: '7px',
                      border: '1px solid',
                      borderColor: btn.active ? (btn.preset === '100pct' ? '#dc2626' : btn.preset === 'none' ? '#16a34a' : '#d97706') : 'rgba(40, 122, 69, 0.18)',
                      background: btn.active ? (btn.preset === '100pct' ? 'rgba(239, 68, 68, 0.15)' : btn.preset === 'none' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)') : '#ffffff',
                      color: btn.active ? (btn.preset === '100pct' ? '#b91c1c' : btn.preset === 'none' ? '#15803d' : '#b45309') : '#334155',
                      fontWeight: btn.active ? 700 : 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Station Roster List */}
            <div
              className="card"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(40, 122, 69, 0.16)',
                borderRadius: '16px',
                padding: '0.9rem 1.1rem',
                boxShadow: '0 6px 20px rgba(22, 38, 25, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1710' }}>Monitoring Network</span>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>{stations.length} Active Stations</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {stations.map((station) => {
                  const isSelected = station.station_id === selectedStationId;
                  const isOutage = outageStationIds.includes(station.station_id);
                  const obs = isOutage ? null : latestObservations[station.station_id];
                  const pm25Val = obs?.pm25;
                  const hasVal = pm25Val !== null && pm25Val !== undefined;
                  const stationAlertCount = alertsByStation[station.station_id]?.length || 0;

                  return (
                    <div
                      key={station.station_id}
                      onClick={() => setSelectedStationId(station.station_id)}
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '9px',
                        backgroundColor: isSelected ? 'rgba(40, 122, 69, 0.1)' : '#ffffff',
                        border: `1px solid ${isSelected ? '#287a45' : 'rgba(40, 122, 69, 0.14)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(40, 122, 69, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {station.station_name.split(',')[0]}
                          </span>
                          {stationAlertCount > 0 && !isOutage && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid rgba(220, 38, 38, 0.25)',
                                fontSize: '9px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                            >
                              <AlertTriangle size={8} />
                              <span>{stationAlertCount}</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                          ID: {station.station_id} · {station.monitoring_authority}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isOutage ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', padding: '2px 6px', borderRadius: '5px', background: '#fee2e2', border: '1px solid rgba(220, 38, 38, 0.25)' }}>
                            OFFLINE
                          </span>
                        ) : hasVal && pm25Val !== null && pm25Val !== undefined ? (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: pm25Val < 30 ? '#15803d' : pm25Val < 60 ? '#854d0e' : '#c2410c',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: pm25Val < 30 ? '#dcfce7' : pm25Val < 60 ? '#fef9c3' : '#ffedd5',
                              border: `1px solid ${pm25Val < 30 ? 'rgba(22, 101, 52, 0.3)' : pm25Val < 60 ? 'rgba(161, 98, 7, 0.3)' : 'rgba(194, 65, 12, 0.3)'}`,
                            }}
                          >
                            {formatNumber(pm25Val, 1)} <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>µg</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>NO DATA</span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStationOutage(station.station_id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isOutage ? '#dc2626' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '3px',
                          }}
                          title={isOutage ? 'Restore sensor' : 'Simulate outage'}
                        >
                          <WifiOff size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Selected Station Quick Diagnostics Card */}
            {selectedStation && (
              <div
                className="card"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  border: '1px solid rgba(40, 122, 69, 0.22)',
                  borderRadius: '16px',
                  padding: '1rem 1.15rem',
                  boxShadow: '0 8px 24px rgba(22, 38, 25, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.04em' }}>
                    Station Inspector
                  </span>
                  {outageStationIds.includes(selectedStation.station_id) ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', padding: '2px 6px', borderRadius: '5px', background: '#fef3c7', border: '1px solid rgba(180, 83, 9, 0.3)' }}>
                      SIMULATED OUTAGE
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', padding: '2px 6px', borderRadius: '5px', background: '#dcfce7', border: '1px solid rgba(22, 101, 52, 0.3)' }}>
                      ONLINE
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0d1710', marginBottom: '0.5rem' }}>
                  {selectedStation.station_name}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.74rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>Zoning:</span>
                    <div style={{ color: '#0d1710', fontWeight: 600 }}>{selectedStation.zone_type}</div>
                  </div>
                  <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>Authority:</span>
                    <div style={{ color: '#0d1710', fontWeight: 600 }}>{selectedStation.monitoring_authority}</div>
                  </div>
                </div>

                <Link
                  to={`/stations/${selectedStation.station_id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '9px',
                    backgroundColor: '#166534',
                    border: '1px solid #166534',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(22, 101, 52, 0.2)',
                  }}
                >
                  <span>Explore Station Diagnostics</span>
                  <ArrowRight size={13} color="#ffffff" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
