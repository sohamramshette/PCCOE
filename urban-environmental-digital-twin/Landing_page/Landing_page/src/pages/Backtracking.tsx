import React, { useEffect, useState, useCallback } from 'react';
import {
  Compass,
  Play,
  Clock,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { getStations } from '../api/stations';
import { simulateBacktracking, getCuratedEvents } from '../api/backtracking';
import { Station } from '../types/station';
import {
  BacktrackingRequest,
  BacktrackingResponse,
  CuratedEventItem,
} from '../types/backtracking';
import { TrajectoryMap } from '../components/backtracking/TrajectoryMap';
import { InvestigationReportCard } from '../components/backtracking/InvestigationReportCard';
import { EvidenceCorrelationTable } from '../components/backtracking/EvidenceCorrelationTable';
import { CuratedEventsSelector } from '../components/backtracking/CuratedEventsSelector';
import { ErrorDisplay } from '../components/common/ErrorDisplay';

// Converts UTC ISO string to local IST string (YYYY-MM-DDTHH:mm) for datetime-local input
const utcToIstInputValue = (utcIso: string): string => {
  const d = new Date(utcIso);
  // IST is UTC + 5h30m (330 minutes)
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).toISOString().substring(0, 16);
};

// Converts local IST input string (YYYY-MM-DDTHH:mm) to UTC ISO string exactly once
const istInputToUtcIso = (istLocalStr: string): string => {
  if (istLocalStr.endsWith('Z')) return istLocalStr;
  const d = new Date(`${istLocalStr}:00+05:30`);
  return d.toISOString();
};

export const Backtracking: React.FC = () => {
  // Master data
  const [stations, setStations] = useState<Station[]>([]);
  const [curatedEvents, setCuratedEvents] = useState<CuratedEventItem[]>([]);
  const [curatedLoading, setCuratedLoading] = useState<boolean>(true);

  // Form State
  const [selectedStationId, setSelectedStationId] = useState<number>(60658); // Hadapsar default
  // Format default arrival datetime as 2025-12-26T21:30 IST (which converts to 2025-12-26T16:00:00Z UTC)
  const [arrivalDatetime, setArrivalDatetime] = useState<string>('2025-12-26T21:30');
  const [backwardDurationHours, setBackwardDurationHours] = useState<number>(24);

  // UI state
  const [selectedCuratedEventId, setSelectedCuratedEventId] = useState<string | null>('hadapsar_winter_smog_20251226');
  const [isCuratedAccordionOpen, setIsCuratedAccordionOpen] = useState<boolean>(true);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktrackingResponse | null>(null);

  // Initial load: stations and curated events
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [stationsData, eventsData] = await Promise.all([
          getStations(true),
          getCuratedEvents(),
        ]);
        if (isMounted) {
          setStations(stationsData || []);
          setCuratedEvents(eventsData.events || []);
          setCuratedLoading(false);
          // Auto-run initial simulation for the default selected benchmark event
          if (eventsData.events && eventsData.events.length > 0) {
            const defaultEv = eventsData.events[0];
            setSimulationLoading(true);
            simulateBacktracking({
              station_id: defaultEv.station_id,
              arrival_datetime_utc: defaultEv.datetime_utc,
              backward_duration_hours: 24,
              step_interval_minutes: 60,
            }).then((res) => {
              if (isMounted) {
                setResult(res);
                setSimulationLoading(false);
              }
            }).catch((err) => {
              if (isMounted) setSimulationLoading(false);
              console.warn('Initial simulation load warning:', err);
            });
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setCuratedLoading(false);
          console.error('Error fetching initial backtracking metadata:', err);
        }
      }
    };
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Curated Event Selection
  const handleSelectCuratedEvent = (event: CuratedEventItem) => {
    setSelectedCuratedEventId(event.event_id);
    setSelectedStationId(event.station_id);
    // Populate the local IST input from the curated event's UTC timestamp
    setArrivalDatetime(utcToIstInputValue(event.datetime_utc));
    setBackwardDurationHours(24);
    // Auto-run simulation for the newly selected event
    setSimulationLoading(true);
    setSimulationError(null);
    simulateBacktracking({
      station_id: event.station_id,
      arrival_datetime_utc: event.datetime_utc,
      backward_duration_hours: 24,
      step_interval_minutes: 60,
    }).then((res) => {
      setResult(res);
      setSimulationLoading(false);
    }).catch((err) => {
      setSimulationLoading(false);
      const errMsg = err instanceof Error ? err.message : 'Simulation failed';
      setSimulationError(errMsg);
    });
  };

  // Run Simulation
  const handleRunSimulation = useCallback(async () => {
    try {
      setSimulationLoading(true);
      setSimulationError(null);

      // Convert local IST datetime input string to ISO UTC format exactly once
      const formattedUtc = istInputToUtcIso(arrivalDatetime);

      const payload: BacktrackingRequest = {
        station_id: selectedStationId,
        arrival_datetime_utc: formattedUtc,
        backward_duration_hours: backwardDurationHours,
        step_interval_minutes: 60,
      };

      const response = await simulateBacktracking(payload);
      setResult(response);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Simulation failed. Please verify timestamp and station availability.';
      setSimulationError(errMsg);
      setResult(null);
    } finally {
      setSimulationLoading(false);
    }
  }, [selectedStationId, arrivalDatetime, backwardDurationHours]);

  return (
    <div className="backtracking-page" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              padding: '6px',
              borderRadius: '10px',
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary)',
            }}>
              <Compass size={24} />
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Pollution Backtracking Engine
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, maxWidth: '820px', lineHeight: 1.5 }}>
            2D kinematic backward atmospheric transport modeling for Pune & PCMC. Traces hourly upwind transport pathways using time-aligned ECMWF ERA5-Land reanalysis horizontal wind fields and provides multi-station empirical concordance analysis.
          </p>
        </div>

        {/* Epistemic Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.08)',
            color: 'var(--primary)',
            border: '1px solid var(--border-blue)',
          }}>
            ERA5-Land Wind Reanalysis
          </span>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.08)',
            color: 'var(--success)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}>
            In-Situ CAAQMS Telemetry
          </span>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(249, 115, 22, 0.08)',
            color: 'var(--accent)',
            border: '1px solid var(--border-orange)',
          }}>
            Non-Causal Transport Vector
          </span>
        </div>
      </div>

      {/* Curated Benchmark Accordion */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
        <div
          onClick={() => setIsCuratedAccordionOpen(!isCuratedAccordionOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
              Curated Historical Pollution Benchmark Episodes
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({curatedEvents.length} pre-audited events)
            </span>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            {isCuratedAccordionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {isCuratedAccordionOpen && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <CuratedEventsSelector
              events={curatedEvents}
              selectedEventId={selectedCuratedEventId}
              onSelectEvent={handleSelectCuratedEvent}
              loading={curatedLoading}
            />
          </div>
        )}
      </div>

      {/* Simulation Controls Panel */}
      <div className="card" style={{ padding: '22px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Compass size={19} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>
            Configure Atmospheric Backward Trajectory
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          alignItems: 'flex-end',
        }}>
          {/* Station Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Receptor Air Quality Station
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(parseInt(e.target.value, 10));
                setSelectedCuratedEventId(null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              {stations.map((stn) => (
                <option key={stn.station_id} value={stn.station_id}>
                  {stn.station_name} (ID: {stn.station_id})
                </option>
              ))}
            </select>
          </div>

          {/* Arrival Date & Time Input (Local IST) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Episode Arrival Timestamp (Local IST)
              </label>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                UTC: {istInputToUtcIso(arrivalDatetime).substring(11, 16)}Z
              </span>
            </div>
            <input
              type="datetime-local"
              value={arrivalDatetime}
              onChange={(e) => {
                setArrivalDatetime(e.target.value);
                setSelectedCuratedEventId(null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Backward Duration Selector (1 - 48h) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Backward Duration: {backwardDurationHours} Hours
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Max 48h (Basin Bound)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="1"
                max="48"
                step="1"
                value={backwardDurationHours}
                onChange={(e) => setBackwardDurationHours(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[12, 24, 36, 48].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBackwardDurationHours(preset)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: backwardDurationHours === preset ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: backwardDurationHours === preset ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div>
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={simulationLoading}
              style={{
                width: '100%',
                padding: '11px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: simulationLoading ? 'not-allowed' : 'pointer',
                opacity: simulationLoading ? 0.7 : 1,
                boxShadow: 'var(--shadow-blue)',
                transition: 'all 0.2s ease',
              }}
            >
              {simulationLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Computing Trajectory...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run Backtracking Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation or API Error Display */}
        {simulationError && (
          <div style={{ marginTop: '16px' }}>
            <ErrorDisplay
              message={simulationError}
              onRetry={handleRunSimulation}
            />
          </div>
        )}
      </div>

      {/* Simulation Results Section */}
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
          }}>
            <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Receptor Station</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.receptor_station.station_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                ID: {result.receptor_station.station_id} • {result.receptor_station.city}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Observed PM2.5</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.observed_pm25_ug_m3 !== null ? `${result.observed_pm25_ug_m3.toFixed(1)} µg/m³` : 'Offline'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                CPCB Tier: {result.cpcb_naqi_category || 'N/A'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Path Distance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
                {result.total_distance_km.toFixed(1)} km
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {result.backward_duration_hours} hours total transport
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Arrival Wind (Reanalysis)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284c7' }}>
                {result.waypoints[0].wind_speed_ms !== null ? `${result.waypoints[0].wind_speed_ms.toFixed(1)} m/s` : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Direction: {result.waypoints[0].wind_dir_deg !== null ? `${result.waypoints[0].wind_dir_deg.toFixed(0)}°` : '—'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Mixing Depth / Vent.</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: (result.waypoints[0].ventilation_index_m2s ?? 1000) < 500 ? '#ea580c' : 'var(--text-primary)' }}>
                {result.waypoints[0].ventilation_index_m2s !== null ? `${result.waypoints[0].ventilation_index_m2s.toFixed(0)} m²/s` : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                PBL: {result.waypoints[0].pbl_height_m !== null ? `${result.waypoints[0].pbl_height_m.toFixed(0)} m` : '—'}
              </div>
            </div>
          </div>

          {/* Interactive Trajectory Map */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>
                  Backward Kinematic Advection Map
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: result.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                  color: result.status === 'COMPLETED' ? '#059669' : '#ea580c',
                  fontWeight: 600,
                }}>
                  {result.status === 'COMPLETED' ? 'Within Pune Domain' : 'Partial Boundary Extrapolation'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {result.waypoints.length} Hourly Waypoints
                </span>
              </div>
            </div>

            <TrajectoryMap
              waypoints={result.waypoints}
              receptor={result.receptor_station}
              observedPm25={result.observed_pm25_ug_m3}
              networkStations={stations}
              coverageStatus={result.status}
            />
          </div>

          {/* Structured Scientific Investigation Report Card */}
          <InvestigationReportCard
            summary={result.investigation_summary}
            metadata={result.metadata}
            receptor={result.receptor_station}
            arrivalUtc={result.arrival_datetime_utc}
            arrivalIst={result.arrival_datetime_ist}
            observedPm25={result.observed_pm25_ug_m3}
            naqiCategory={result.cpcb_naqi_category}
            totalDistanceKm={result.total_distance_km}
            durationHours={result.backward_duration_hours}
            status={result.status}
          />

          {/* Multi-Station Evidence & Correlation Table */}
          <EvidenceCorrelationTable evidence={result.multi_station_evidence} />

          {/* Waypoint Chronological Audit Table */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>
                Waypoint Chronological Telemetry Log
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Step</th>
                    <th style={{ padding: '8px 10px' }}>UTC Timestamp</th>
                    <th style={{ padding: '8px 10px' }}>Local IST</th>
                    <th style={{ padding: '8px 10px' }}>Coordinates</th>
                    <th style={{ padding: '8px 10px' }}>Wind Speed</th>
                    <th style={{ padding: '8px 10px' }}>Wind Dir</th>
                    <th style={{ padding: '8px 10px' }}>PBL Mixing</th>
                    <th style={{ padding: '8px 10px' }}>Ventilation</th>
                    <th style={{ padding: '8px 10px' }}>Step Dist.</th>
                    <th style={{ padding: '8px 10px' }}>Cumulative</th>
                    <th style={{ padding: '8px 10px' }}>Domain</th>
                  </tr>
                </thead>
                <tbody>
                  {result.waypoints.map((wp) => (
                    <tr
                      key={wp.step_hours_back}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                        {wp.step_hours_back === 0 ? 'Receptor (t=0)' : `t - ${wp.step_hours_back}h`}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {wp.datetime_utc.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {wp.datetime_local_ist}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.latitude.toFixed(4)}°N, {wp.longitude.toFixed(4)}°E
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.wind_speed_ms !== null ? `${wp.wind_speed_ms.toFixed(1)} m/s` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.wind_dir_deg !== null ? `${wp.wind_dir_deg.toFixed(0)}°` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.pbl_height_m !== null ? `${wp.pbl_height_m.toFixed(0)} m` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.ventilation_index_m2s !== null ? `${wp.ventilation_index_m2s.toFixed(0)} m²/s` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {wp.step_distance_km.toFixed(1)} km
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                        {wp.cumulative_distance_km.toFixed(1)} km
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: wp.spatial_coverage_status === 'WITHIN_NETWORK_DOMAIN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 88, 12, 0.1)',
                          color: wp.spatial_coverage_status === 'WITHIN_NETWORK_DOMAIN' ? '#059669' : '#ea580c',
                          fontWeight: 600,
                        }}>
                          {wp.spatial_coverage_status === 'WITHIN_NETWORK_DOMAIN' ? 'Within' : 'Exceeded'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="card" style={{
          padding: '60px 24px',
          borderRadius: '16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
          }}>
            <Compass size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>
            No Active Backtracking Simulation
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            Select a monitoring station, set the episode arrival time, and click <strong>Run Backtracking Simulation</strong> above, or load one of the curated historical benchmark episodes.
          </p>
        </div>
      )}
    </div>
  );
};
