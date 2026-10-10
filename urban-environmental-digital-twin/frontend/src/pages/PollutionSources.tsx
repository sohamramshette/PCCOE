import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wind,
  Compass,
  MapPin,
  RefreshCw,
  Info,
  AlertCircle,
  Layers,
  Eye,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { simulateBacktracking } from '../api/backtracking';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { BacktrackingResponse } from '../types/backtracking';
import {
  interpretBacktrackingData,
  UpwindCorridorInsight,
} from '../utils/pollutionSources';
import { BacktrackingAirflowMap } from '../components/map/BacktrackingAirflowMap';
import { calcPM25SubIndex, getNAQICategoryInfo } from '../utils/aqi';

export const PollutionSources: React.FC = () => {
  // State: Station Network and Selection
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number>(11613); // Default Shivajinagar
  const [latestObs, setLatestObs] = useState<ObservationItem | null>(null);

  // State: Backtracking Trajectory Data
  const [backtrackingData, setBacktrackingData] = useState<BacktrackingResponse | null>(null);
  const [backwardHours, setBackwardHours] = useState<number>(12); // Default 12 hours
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // 1. Initial Station Network Load
  useEffect(() => {
    let isMounted = true;
    const fetchStationNetwork = async () => {
      try {
        const stationList = await getStations(true);
        if (isMounted) {
          setStations(stationList);
          // If Shivajinagar (11613) is active, keep it; otherwise pick first station
          const found = stationList.find((s) => s.station_id === 11613) || stationList[0] || null;
          if (found) {
            setSelectedStationId(found.station_id);
          }
        }
      } catch {
        if (isMounted) {
          setSimulationError('Failed to connect to regional air quality monitoring network.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStationNetwork();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Latest Observation & Run Atmospheric Backtracking
  const loadBacktrackingForStation = useCallback(async (stId: number, hours: number) => {
    try {
      setIsSimulating(true);
      setSimulationError(null);

      // Fetch latest observation to obtain verified arrival timestamp
      const obsRes = await getObservations(stId, { limit: 1, order: 'desc' }).catch(() => ({ items: [] }));
      const arrivalObs = obsRes.items.length > 0 ? obsRes.items[0] : null;
      setLatestObs(arrivalObs);

      // Default to latest observation UTC timestamp or latest historical hour in DB (2026-10-10T21:00:00Z)
      const arrivalUtc = arrivalObs?.datetime_utc || '2026-10-10T21:00:00Z';

      const simRes = await simulateBacktracking({
        station_id: stId,
        arrival_datetime_utc: arrivalUtc,
        backward_duration_hours: hours,
        step_interval_minutes: 60,
      });

      setBacktrackingData(simRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backtracking calculation unavailable';
      setSimulationError(`Atmospheric trajectory calculation unavailable: ${msg}.`);
      setBacktrackingData(null);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStationId) {
      loadBacktrackingForStation(selectedStationId, backwardHours);
    }
  }, [selectedStationId, backwardHours, loadBacktrackingForStation]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.station_id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  // Plain-Language Interpretation
  const insight: UpwindCorridorInsight | null = useMemo(() => {
    return interpretBacktrackingData(backtrackingData);
  }, [backtrackingData]);

  // Category info for observed PM2.5
  const obsSubIndex = calcPM25SubIndex(latestObs?.pm25);
  const obsCatInfo = obsSubIndex !== null ? getNAQICategoryInfo(obsSubIndex) : null;

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
          Loading Atmospheric Backtracking...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#9eab93' }}>
          Connecting to meteorological wind reanalysis and Pune monitoring stations
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Introduction Banner */}
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
              <Wind size={13} />
              Pollution Sources &amp; Atmospheric Transport
            </span>
            <span style={{ fontSize: '11px', color: '#9eab93' }}>Pune &amp; PCMC Regional Airflow Analysis</span>
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
            Where Does Your Air Travel From?
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#c9d3bf', maxWidth: '780px', lineHeight: 1.5 }}>
            Explore atmospheric backtracking trajectories to see the path air parcels took before arriving in your neighborhood.
            Understand how regional wind patterns connect different parts of Pune and Pimpri-Chinchwad.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => loadBacktrackingForStation(selectedStationId, backwardHours)}
            disabled={isSimulating}
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
              cursor: isSimulating ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Refresh atmospheric transport calculation"
          >
            <RefreshCw size={14} style={{ animation: isSimulating ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSimulating ? 'Calculating...' : 'Recalculate Airflow'}</span>
          </button>
        </div>
      </div>

      {/* 2. Locality Selection & Backward Duration Selector */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '1.5rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="#8fa07e" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f4f6f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Monitoring Station / Neighborhood:
            </span>
          </div>

          {/* Time Duration Toggle: 6h / 12h / 24h */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: '#9eab93' }}>Lookback:</span>
            <div
              style={{
                display: 'flex',
                background: 'rgba(14, 20, 14, 0.85)',
                border: '1px solid rgba(163, 181, 147, 0.25)',
                borderRadius: '10px',
                padding: '2px',
              }}
            >
              {[
                { hours: 6, label: 'Past 6h' },
                { hours: 12, label: 'Past 12h' },
                { hours: 24, label: 'Past 24h' },
              ].map((h) => {
                const active = backwardHours === h.hours;
                return (
                  <button
                    key={h.hours}
                    type="button"
                    onClick={() => setBackwardHours(h.hours)}
                    style={{
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '8px',
                      background: active ? '#8fa07e' : 'transparent',
                      color: active ? '#121a11' : '#c9d3bf',
                      fontSize: '0.74rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Station Selection Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {stations.map((st) => {
            const isSelected = st.station_id === selectedStationId;
            return (
              <button
                key={st.station_id}
                type="button"
                onClick={() => setSelectedStationId(st.station_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #8fa07e' : '1px solid rgba(163, 181, 147, 0.2)',
                  background: isSelected ? 'rgba(143, 160, 126, 0.22)' : 'rgba(14, 20, 14, 0.6)',
                  color: isSelected ? '#f4f6f0' : '#c9d3bf',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#4ade80' : 'rgba(163, 181, 147, 0.5)',
                  }}
                />
                <span>{st.station_name.split(',')[0]}</span>
                <span style={{ fontSize: '0.7rem', color: '#9eab93' }}>({st.city})</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#9eab93', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={13} color="#8fa07e" />
          <span>
            Selected Receptor: <strong>{selectedStation?.station_name}</strong> ({selectedStation?.zone_type} · {selectedStation?.city}).
            Backtracking traces air masses backwards in time to identify upwind sectors.
          </span>
        </div>
      </div>

      {/* 3. Four Key Environmental Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card A: Measured PM2.5 at Destination */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '20px',
            padding: '1.4rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Local PM2.5 Measured
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(74, 222, 128, 0.18)',
                color: '#4ade80',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                fontWeight: 600,
              }}
            >
              Ground Sensor
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f4f6f0', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {latestObs?.pm25 !== null && latestObs?.pm25 !== undefined ? latestObs.pm25.toFixed(1) : '--'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#9eab93', fontWeight: 600 }}>µg/m³</span>
          </div>

          <div style={{ fontSize: '0.74rem', color: obsCatInfo?.color || '#a3b593', fontWeight: 600 }}>
            Tier: {obsCatInfo?.category || 'Awaiting Measurement'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8fa07e', marginTop: '2px' }}>
            Station: {selectedStation?.station_name.split(',')[0]}
          </div>
        </div>

        {/* Card B: Atmospheric Wind Direction & Origin */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '20px',
            padding: '1.4rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Wind Origin Sector
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 600,
              }}
            >
              ERA5 Reanalysis
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f4f6f0', lineHeight: 1.1 }}>
              {insight ? insight.compassDirection : 'Analyzing...'}
            </span>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#c9d3bf' }}>
            Bearing: {insight?.compassDegrees !== null ? `${insight?.compassDegrees}°` : '--'} · Speed: {insight?.windSpeedKmh ? `${insight.windSpeedKmh} km/h` : '--'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8fa07e', marginTop: '2px' }}>
            Wind classification: {insight?.windSpeedCategory || 'Moderate'}
          </div>
        </div>

        {/* Card C: Transport Distance */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '20px',
            padding: '1.4rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transport Distance
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(143, 160, 126, 0.18)',
                color: '#a3b593',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                fontWeight: 600,
              }}
            >
              Past {backwardHours}h Advection
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f4f6f0', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {insight ? insight.transportDistanceKm : '--'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#9eab93', fontWeight: 600 }}>km</span>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#c9d3bf' }}>
            Cumulative geodesic travel path
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8fa07e', marginTop: '2px' }}>
            Waypoints tracked: {backtrackingData?.waypoints?.length || 0} hourly steps
          </div>
        </div>

        {/* Card D: Atmospheric Dispersion Context */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '20px',
            padding: '1.4rem',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Atmospheric Mixing
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(143, 160, 126, 0.18)',
                color: '#a3b593',
                border: '1px solid rgba(163, 181, 147, 0.3)',
                fontWeight: 600,
              }}
            >
              Boundary Layer
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f4f6f0', lineHeight: 1.1 }}>
              {backtrackingData?.waypoints?.[0]?.pbl_height_m ? `${backtrackingData.waypoints[0].pbl_height_m} m` : 'Moderate'}
            </span>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#c9d3bf' }}>
            Ventilation: {backtrackingData?.waypoints?.[0]?.ventilation_index_m2s ? `${backtrackingData.waypoints[0].ventilation_index_m2s} m²/s` : 'Standard'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8fa07e', marginTop: '2px' }}>
            Vertical dilution capacity across basin
          </div>
        </div>
      </div>

      {/* 4. Main Two-Column Layout: Interactive Map + Scientific Interpretation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.35fr) minmax(360px, 1fr)',
          gap: '1.75rem',
          alignItems: 'start',
        }}
        className="pollution-sources-layout"
      >
        {/* Left Column: Atmospheric Airflow Map */}
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#9eab93', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kinematic Atmospheric Backtracking
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f4f6f0' }}>
                Air Mass Transport Corridor (Past {backwardHours}h)
              </div>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Airflow: Cyan Dashed Path
            </span>
          </div>

          {/* Error notification if simulation fails */}
          {simulationError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{simulationError}</span>
            </div>
          )}

          {/* Leaflet Airflow Map */}
          <div style={{ minHeight: '520px', width: '100%', position: 'relative' }}>
            {isSimulating && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1000,
                  background: 'rgba(18, 26, 18, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '20px',
                  color: '#f4f6f0',
                  gap: '10px',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <RefreshCw size={28} style={{ animation: 'spin 1.2s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tracing 2D atmospheric advection trajectory...</span>
              </div>
            )}

            <BacktrackingAirflowMap
              waypoints={backtrackingData?.waypoints || []}
              receptor={backtrackingData?.receptor_station || null}
              observedPm25={latestObs?.pm25 ?? null}
              upwindStations={insight?.upwindStations || []}
              downwindStations={insight?.downwindStations || []}
            />
          </div>
        </div>

        {/* Right Column: Upwind Corridor Explanation, Potential Influences & Educational Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card 1: What Does This Path Indicate? (Requirement 6) */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
              border: '1px solid rgba(163, 181, 147, 0.22)',
              borderRadius: '24px',
              padding: '1.5rem',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Compass size={17} color="#8fa07e" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Where Did This Air Mass Travel From?
              </h2>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.86rem', color: '#c9d3bf', lineHeight: 1.55 }}>
              {insight ? insight.corridorSummary : 'Analyzing wind trajectory and upwind sector alignment...'}
            </p>

            {/* Upwind monitoring station alignment */}
            {insight && insight.upwindStations.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  fontSize: '0.78rem',
                  color: '#bae6fd',
                  marginBottom: '10px',
                }}
              >
                <strong style={{ color: '#ffffff' }}>Upwind Station Alignment:</strong>{' '}
                {insight.upwindStations.map((s) => s.station_name.split(',')[0]).join(', ')} is located directly along the
                incoming atmospheric corridor ({insight.upwindStations[0]?.distance_to_receptor_km.toFixed(1)} km upwind).
              </div>
            )}

            {/* Important distinction between atmospheric movement and source blame */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(14, 20, 14, 0.65)',
                border: '1px solid rgba(163, 181, 147, 0.16)',
                fontSize: '0.74rem',
                color: '#9eab93',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: '#f4f6f0' }}>Crucial Scientific Distinction:</strong> Atmospheric backtracking identifies
              the general upwind geographic sector. It does <em>not</em> prove that any specific factory, vehicular corridor,
              or construction site caused the measured particulate readings.
            </div>
          </div>

          {/* Card 2: Possible Environmental Influences (Requirement 7) */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
              border: '1px solid rgba(163, 181, 147, 0.22)',
              borderRadius: '24px',
              padding: '1.5rem',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Layers size={17} color="#8fa07e" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Possible Urban Pollution Influences
              </h2>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#c9d3bf', lineHeight: 1.5 }}>
              Urban air quality in Pune and PCMC is typically composed of a mixed background of diffuse sources
              accumulating along atmospheric transport corridors:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                {
                  title: 'Vehicular Emissions & Roadway Corridors',
                  desc: 'Tailpipe emissions and resuspended road dust along regional arterial highways and urban chowks.',
                },
                {
                  title: 'Construction Activity & Ground Dust',
                  desc: 'Coarse and fine dust generated by infrastructure earthwork and dry seasonal winds.',
                },
                {
                  title: 'Regional Background & Industrial Activity',
                  desc: 'Combustion and industrial operations situated across regional municipal corridors.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(14, 20, 14, 0.55)',
                    border: '1px solid rgba(163, 181, 147, 0.12)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#f4f6f0' }}>{item.title}</div>
                  <div style={{ color: '#9eab93', fontSize: '0.72rem', marginTop: '2px' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                color: '#9eab93',
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              * Note: AirLens does not fabricate arbitrary percentage breakdowns (e.g. 40% industry / 30% traffic)
              because kinematic trajectory modeling calculates advective transport, not chemical mass balance source apportionment.
            </div>
          </div>

          {/* Card 3: Educational Panel: "How to Read This Map" (Requirement 8) */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(22, 32, 21, 0.85) 0%, rgba(14, 20, 14, 0.95) 100%)',
              border: '1px solid rgba(163, 181, 147, 0.22)',
              borderRadius: '24px',
              padding: '1.5rem',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Eye size={17} color="#8fa07e" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                How to Read This Map
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: '#c9d3bf', lineHeight: 1.5 }}>
              <div>
                1. <strong>Backward in Time:</strong> The path starts at the upwind origin (where the air parcel was {backwardHours} hours ago) and traces forward to the green pin where the local monitor is located.
              </div>
              <div>
                2. <strong>Atmospheric Transport:</strong> Wind carries airborne particulates across ward and municipal boundaries, demonstrating that local air is influenced by wider regional weather.
              </div>
              <div>
                3. <strong>Plausible Pathway, Not Direct Blame:</strong> Proximity to an industrial cluster or highway indicates physical transport alignment, not legal proof of an emission violation.
              </div>
              <div>
                4. <strong>Data Sources:</strong> Wind vectors are derived from ECMWF ERA5-Land reanalysis winds, while particulate readings are recorded by CPCB/IITM SAFAR regulatory CAAQMS monitors.
              </div>
            </div>
          </div>

          {/* Card 4: Data Provenance & Limitations (Requirement 9) */}
          <div
            style={{
              background: 'rgba(14, 20, 14, 0.65)',
              border: '1px solid rgba(163, 181, 147, 0.16)',
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '0.74rem',
              color: '#9eab93',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c9d3bf' }}>
              <span>Simulation Arrival Timestamp:</span>
              <strong style={{ color: '#f4f6f0' }}>{insight ? insight.provenanceTimestampIST : 'Historical'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Meteorological Wind Model:</span>
              <span>ECMWF ERA5-Land Reanalysis (Open-Meteo)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Air Quality Sensor Telemetry:</span>
              <span>Regulatory CAAQMS (IITM SAFAR / CPCB)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
