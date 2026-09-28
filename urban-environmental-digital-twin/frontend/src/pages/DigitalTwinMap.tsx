import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Database,
  ArrowRight,
  Flame,
  Crosshair,
  RotateCcw,
  Calendar,
  Info,
  Radio,
  RefreshCw,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getSpatialInterpolation, interpolateCoordinate } from '../api/spatial';
import { triggerOpenAQSync } from '../api/sync';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { InterpolatedGridPoint, CoordinateInterpolationResponse } from '../types/spatial';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import { MapLegend } from '../components/map/MapLegend';
import { SyncWidget } from '../components/sync/SyncWidget';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
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
    timestamp: undefined, // pulls freshest realtime observation
    description: 'Active real-time telemetry stream ingesting live CPCB / IITM SAFAR telemetry via OpenAQ API v3. Station cards, AQI tiers, and IDW spatial continuous dots auto-renew continuously.',
    seasonTag: 'Continuous Real-Time Stream · Auto-Renew Active',
    isLive: true,
  },
  {
    id: 'monsoon_clean',
    name: 'Latest / Post-Monsoon Clean',
    badge: 'GOOD / SATISFACTORY',
    color: '#059669',
    timestamp: undefined, // uses latest in DB (Sep 24, 2026)
    description: 'Monsoon precipitation scavenging has washed particulate matter out of the troposphere. Station PM2.5 ranges from 1.1 to 32.4 µg/m³ (all CPCB Good/Satisfactory green dots).',
    seasonTag: 'Sep 2026 · Post-Monsoon Clean Air'
  },
  {
    id: 'winter_moderate',
    name: 'Winter Traffic Morning',
    badge: 'MODERATE / POOR',
    color: '#ca8a04',
    timestamp: '2026-01-06T07:00:00Z',
    description: 'Morning commute emissions under moderate winter cooling. Station PM2.5 ranges from 35.4 to 101.5 µg/m³ across Pune (Yellow & Orange plumes).',
    seasonTag: 'Jan 06, 2026 · Morning Commute Peak'
  },
  {
    id: 'winter_smog',
    name: 'Winter Smog Inversion',
    badge: 'VERY POOR / SEVERE',
    color: '#dc2626',
    timestamp: '2025-12-26T16:00:00Z',
    description: 'Ground-level thermal inversion traps vehicular & industrial emissions. PM2.5 spikes up to 570.8 µg/m³ in Hadapsar (Red & Maroon hotspots).',
    seasonTag: 'Dec 26, 2025 · Winter Inversion Smog'
  }
];

export const DigitalTwinMap: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [latestObservations, setLatestObservations] = useState<Record<number, ObservationItem | null>>({});
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('live_telemetry');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  
  // Layer controls
  const [showTrafficBuffer, setShowTrafficBuffer] = useState<boolean>(true);
  const [showActivityBuffer, setShowActivityBuffer] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [idwPower, setIdwPower] = useState<number>(2.0);

  // Heatmap & Inspection state
  const [heatmapGrid, setHeatmapGrid] = useState<InterpolatedGridPoint[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
  const [customInspection, setCustomInspection] = useState<CoordinateInterpolationResponse | null>(null);
  const [inspectingCoord, setInspectingCoord] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentEpisode = ATMOSPHERIC_EPISODES.find((e) => e.id === selectedEpisodeId) || ATMOSPHERIC_EPISODES[0];

  const loadHeatmap = useCallback(async (powerVal: number = idwPower, timestamp?: string) => {
    try {
      setHeatmapLoading(true);
      const res = await getSpatialInterpolation({ power: powerVal, timestamp });
      setHeatmapGrid(res.grid_points);
    } catch (err: unknown) {
      console.error('Failed to load spatial interpolation heatmap:', err);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  const refreshStationReadings = async (stationList: Station[], targetTimestamp?: string) => {
    const obsMap: Record<number, ObservationItem | null> = {};
    await Promise.all(
      stationList.map(async (st) => {
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
      })
    );
    setLatestObservations(obsMap);
  };

  const loadData = async (episodeId: string = selectedEpisodeId) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active monitoring stations
      const stationList = await getStations(true);
      setStations(stationList);

      if (stationList.length > 0 && selectedStationId === null) {
        setSelectedStationId(stationList[0].station_id);
      }

      const ep = ATMOSPHERIC_EPISODES.find((e) => e.id === episodeId) || ATMOSPHERIC_EPISODES[0];

      // Fetch observation for each station in parallel
      await refreshStationReadings(stationList, ep.timestamp);

      // Load spatial interpolation grid
      await loadHeatmap(idwPower, ep.timestamp);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
          // Trigger automated background renew
          (async () => {
            try {
              setIsSyncingLive(true);
              const currentStations = stations.length > 0 ? stations : await getStations(true);
              await refreshStationReadings(currentStations, undefined);
              await loadHeatmap(idwPower, undefined);
              setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
    
    // If switching to live telemetry, force a fresh pull
    if (ep.isLive) {
      handleForceLiveSync();
      return;
    }

    // Load heatmap for historical episode
    await loadHeatmap(idwPower, ep.timestamp);

    // Refresh station readings for historical episode
    const currentStations = stations.length > 0 ? stations : await getStations(true);
    await refreshStationReadings(currentStations, ep.timestamp);
  };

  const handleSyncSuccess = () => {
    // Refresh both observations and continuous heatmap
    loadData();
  };

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) || null;

  return (
    <div className="page-container">
      {/* Header & Spatial Subtitle */}
      <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pune Digital Twin</h1>
          <p className="page-subtitle">
            Spatial continuous air quality interpolation &amp; live environmental telemetry
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <SyncWidget onSyncCompleted={handleSyncSuccess} />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <ProvenanceBadge classification="OBSERVED" />
            <ProvenanceBadge classification="REANALYSIS" />
            <ProvenanceBadge classification="STATIC" />
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="info-banner-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <MapPin size={14} className="text-primary" />
            <span>Monitoring Stations</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stations.length || 6}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Continuous CAAQMN stations
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <Flame size={14} className="text-primary" />
            <span>Spatial Interpolation</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            2D IDW Continuous Surface
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {heatmapGrid.length} grid cells across Pune &amp; PCMC
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <Database size={14} className="text-primary" />
            <span>Live Data Sync</span>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            OpenAQ API v3 Pipeline
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            In-situ sensor telemetry + reanalysis
          </div>
        </div>
      </div>

      {/* Main Spatial Twin Layout */}
      {loading ? (
        <LoadingSpinner message="Loading spatial twin geometry and monitoring network..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadData} />
      ) : (
        <div className="digital-twin-grid">
          {/* Left Column: Interactive Map */}
          <div className="map-column">
            {/* Atmospheric Episode / Season Selector */}
            <div
              className="card"
              style={{
                marginBottom: '0.75rem',
                padding: '0.65rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} className="text-primary" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                  Monitoring Mode &amp; Scenarios:
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ATMOSPHERIC_EPISODES.map((ep) => {
                  const isSelected = ep.id === selectedEpisodeId;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => handleEpisodeChange(ep.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${ep.color}` : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? `${ep.color}15` : '#ffffff',
                        color: isSelected ? ep.color : '#475569',
                        boxShadow: isSelected && ep.isLive ? '0 0 10px rgba(37, 99, 235, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ep.isLive ? (
                        <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
                          <span
                            style={{
                              position: 'absolute',
                              display: 'inline-flex',
                              height: '100%',
                              width: '100%',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              opacity: 0.75,
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                          <span
                            style={{
                              position: 'relative',
                              display: 'inline-flex',
                              borderRadius: '50%',
                              height: '8px',
                              width: '8px',
                              backgroundColor: '#dc2626',
                            }}
                          />
                        </span>
                      ) : (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ep.color }} />
                      )}

                      <span>{ep.name}</span>

                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? (ep.isLive ? '#2563eb' : ep.color) : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#475569',
                        }}
                      >
                        {ep.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Mode Banner: Live Stream vs Historical Scenarios */}
            {currentEpisode.isLive ? (
              <div
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.65rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderLeft: '4px solid #16a34a',
                  color: '#14532d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: '280px' }}>
                  <Radio size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>LIVE TELEMETRY STREAM ACTIVE</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                        ● AUTO-RENEWING
                      </span>
                    </div>
                    <div style={{ color: '#334155' }}>
                      Ingesting continuous telemetry from CPCB / IITM SAFAR stations via OpenAQ API v3. Map grid nodes, station cards, and pinpoint estimates renew dynamically.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                    <div>Last renewed: <strong style={{ color: '#0f172a' }}>{lastSyncTime}</strong></div>
                    <div style={{ fontSize: '10px', color: '#16a34a' }}>
                      Next auto-poll in <strong>{countdown}s</strong>
                    </div>
                  </div>
                  <button
                    onClick={handleForceLiveSync}
                    disabled={isSyncingLive}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #16a34a',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isSyncingLive ? 'not-allowed' : 'pointer',
                      opacity: isSyncingLive ? 0.7 : 1,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    title="Force an instant pull from OpenAQ CAAQMS servers"
                  >
                    <RefreshCw size={12} className={isSyncingLive ? 'animate-spin' : ''} />
                    <span>{isSyncingLive ? 'Syncing...' : 'Force Sync Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  backgroundColor: `${currentEpisode.color}10`,
                  borderLeft: `4px solid ${currentEpisode.color}`,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <Info size={15} style={{ color: currentEpisode.color, flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: currentEpisode.color }}>{currentEpisode.seasonTag}:</strong>{' '}
                  {currentEpisode.description}
                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                    (Historical scenario mode active · live auto-sync paused for demonstration)
                  </span>
                </div>
              </div>
            )}

            {/* Spatial Heatmap Layer Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px 8px 0 0',
                fontSize: '12px',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: showHeatmap ? '#f97316' : '#cbd5e1',
                    backgroundColor: showHeatmap ? '#fff7ed' : '#ffffff',
                    color: showHeatmap ? '#ea580c' : '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Toggle continuous PM2.5 IDW spatial interpolation heatmap"
                >
                  <Flame size={14} />
                  <span>IDW Heatmap Layer ({showHeatmap ? 'ON' : 'OFF'})</span>
                </button>

                {showHeatmap && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Power (p):</span>
                    {[1.5, 2.0, 3.0].map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePowerChange(p)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: idwPower === p ? '#2563eb' : '#e2e8f0',
                          backgroundColor: idwPower === p ? '#eff6ff' : '#ffffff',
                          color: idwPower === p ? '#1d4ed8' : '#64748b',
                          fontSize: '11px',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '11px' }}>
                {heatmapLoading && <span style={{ color: '#ea580c', fontStyle: 'italic' }}>Calculating IDW...</span>}
                {inspectingCoord && <span style={{ color: '#2563eb', fontStyle: 'italic' }}>Estimating coordinate...</span>}
                <Crosshair size={13} style={{ color: '#3b82f6' }} />
                <span>Click map to inspect any neighborhood coordinate</span>
                {customInspection && (
                  <button
                    onClick={() => setCustomInspection(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={10} /> Clear Pin
                  </button>
                )}
              </div>

            </div>

            <div className="card map-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', borderRadius: '0 0 8px 8px' }}>
              <PuneTwinMap
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
                latestObservations={latestObservations}
                showTrafficBuffer={showTrafficBuffer}
                showActivityBuffer={showActivityBuffer}
                showHeatmap={showHeatmap}
                heatmapGridPoints={heatmapGrid}
                customInspectionResult={customInspection}
                onMapClickCoordinate={handleMapClick}
                onClearCustomInspection={() => setCustomInspection(null)}
              />

              {/* Overlay Map Legend */}
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

          {/* Right Column: Station Selector & Spatial Exposure Panel */}
          <div className="station-sidebar-column">
            {/* Custom Coordinate Pinpoint Inspection Banner */}
            {customInspection && (
              <div
                className="card"
                style={{
                  padding: '1.15rem',
                  marginBottom: '1rem',
                  border: `2px solid ${customInspection.color}`,
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crosshair size={15} style={{ color: customInspection.color }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e293b' }}>
                      Pinpoint Location Estimate
                    </span>
                  </div>
                  <button
                    onClick={() => setCustomInspection(null)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: customInspection.color }}>
                    {customInspection.interpolated_pm25}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>µg/m³</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: `${customInspection.color}20`,
                      color: customInspection.color,
                      border: `1px solid ${customInspection.color}60`,
                    }}
                  >
                    {customInspection.aqi_category}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.6rem' }}>
                  Nearest: <strong>{customInspection.nearest_station_name}</strong> ({customInspection.distance_to_nearest_km} km)
                  <span style={{ marginLeft: '6px', color: '#059669', fontWeight: 600 }}>
                    • {Math.round(customInspection.confidence_score * 100)}% confidence
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Sensor Attribution Weights:
                  </div>
                  {customInspection.contributing_stations.slice(0, 3).map((st) => (
                    <div key={st.station_id} style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>{st.station_name.split(',')[0]} ({st.distance_km} km)</span>
                        <span style={{ fontWeight: 600 }}>{st.weight_percentage}%</span>
                      </div>
                      <div style={{ height: '3px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${st.weight_percentage}%`, backgroundColor: '#3b82f6' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} className="text-primary" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pune Monitoring Network</h3>
                </div>
                <span className="badge badge-primary">{stations.length} Active</span>
              </div>


              {/* Station List Selector */}
              <div className="twin-station-list">
                {stations.map((station) => {
                  const isSelected = station.station_id === selectedStationId;
                  const obs = latestObservations[station.station_id];
                  const hasVal = obs && obs.pm25 !== null && obs.pm25 !== undefined;

                  return (
                    <div
                      key={station.station_id}
                      onClick={() => setSelectedStationId(station.station_id)}
                      className={`twin-station-item ${isSelected ? 'active' : ''}`}
                    >
                      <div className="twin-station-info">
                        <div className="twin-station-name">{station.station_name}</div>
                        <div className="twin-station-meta">
                          <span>ID: {station.station_id}</span>
                          <span>•</span>
                          <span>{station.monitoring_authority}</span>
                        </div>
                      </div>

                      <div className="twin-station-badge-col">
                        {hasVal ? (
                          <div className="twin-pm25-pill">
                            <span className="val">{formatNumber(obs.pm25, 1)}</span>
                            <span className="unit">µg/m³</span>
                          </div>
                        ) : (
                          <span className="badge badge-muted">NO DATA</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Station Summary Card */}
              {selectedStation && (
                <div className="selected-station-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Selected Station Details
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {selectedStation.station_name}
                      </div>
                    </div>
                    <span className="badge badge-success">ACTIVE</span>
                  </div>

                  <div className="selected-station-grid">
                    <div className="diag-stat">
                      <div className="diag-label">Station ID</div>
                      <div className="diag-val font-mono">{selectedStation.station_id}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Zone Type</div>
                      <div className="diag-val">{selectedStation.zone_type}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Authority</div>
                      <div className="diag-val">{selectedStation.monitoring_authority}</div>
                    </div>
                    <div className="diag-stat">
                      <div className="diag-label">Coordinates</div>
                      <div className="diag-val font-mono">
                        {selectedStation.latitude.toFixed(4)}°, {selectedStation.longitude.toFixed(4)}°
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      to={`/stations/${selectedStation.station_id}`}
                      className="btn btn-primary btn-sm w-full"
                      style={{ justifyContent: 'center' }}
                    >
                      <span>Explore Station Diagnostics</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
