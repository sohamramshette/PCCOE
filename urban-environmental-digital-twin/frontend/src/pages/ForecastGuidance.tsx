import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  MapPin,
  RefreshCw,
  Info,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Footprints,
  Smile,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getForecastTrajectory } from '../api/forecast';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { ForecastTrajectoryResponse } from '../types/forecast';
import {
  ActivityType,
  interpretForecastAndActivity,
  formatISTTime,
  formatShortHour,
} from '../utils/activityGuidance';
import { calcPM25SubIndex, getNAQICategoryInfo } from '../utils/aqi';

export const ForecastGuidance: React.FC = () => {
  const [searchParams] = useSearchParams();

  // State: Stations and Selected Location
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [latestObs, setLatestObs] = useState<ObservationItem | null>(null);

  // State: Forecast Trajectory & Horizon
  const [trajectoryData, setTrajectoryData] = useState<ForecastTrajectoryResponse | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(24);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // State: Activity Guidance
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('exercise');

  // 1. Initial Load: Fetch Active Stations
  useEffect(() => {
    let isMounted = true;
    const initStations = async () => {
      try {
        const stationList = await getStations(true);
        if (isMounted) {
          setStations(stationList);

          // Check if station passed in URL query param
          const stationParam = searchParams.get('station');
          const targetStationId = stationParam ? parseInt(stationParam, 10) : null;
          const matchingStation = targetStationId
            ? stationList.find((s) => s.station_id === targetStationId)
            : null;

          if (matchingStation) {
            setSelectedStationId(matchingStation.station_id);
          } else {
            // Default to Shivajinagar (11613) if available, else first station
            const defaultStation =
              stationList.find((s) => s.station_id === 11613) || stationList[0] || null;
            if (defaultStation) {
              setSelectedStationId(defaultStation.station_id);
            }
          }
        }
      } catch {
        if (isMounted) {
          setForecastError('Failed to connect to regional air quality network.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initStations();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Observations & Forecast for Selected Station
  const loadStationForecast = useCallback(async (stId: number) => {
    try {
      setIsRefreshing(true);
      setForecastError(null);

      // Concurrent fetch: observation and forecast trajectory
      const [obsRes, trajectoryRes] = await Promise.allSettled([
        getObservations(stId, { limit: 1, order: 'desc' }),
        getForecastTrajectory(stId, { horizon_hours: 24 }),
      ]);

      if (obsRes.status === 'fulfilled' && obsRes.value.items.length > 0) {
        setLatestObs(obsRes.value.items[0]);
      } else {
        setLatestObs(null);
      }

      if (trajectoryRes.status === 'fulfilled') {
        setTrajectoryData(trajectoryRes.value);
      } else {
        setTrajectoryData(null);
        setForecastError('Machine learning forecast trajectory is currently unavailable for this station.');
      }
    } catch {
      setForecastError('Unable to load environmental forecast data. Please check back shortly.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStationId) {
      loadStationForecast(selectedStationId);
    }
  }, [selectedStationId, loadStationForecast]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.station_id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  // Interpret Forecast and Generate Activity Guidance
  const interpretation = useMemo(() => {
    const stationName = selectedStation ? selectedStation.station_name : 'Selected Locality';
    return interpretForecastAndActivity(
      stationName,
      latestObs,
      trajectoryData?.trajectory || [],
      trajectoryData?.initialization_time_utc || null,
      selectedActivity
    );
  }, [selectedStation, latestObs, trajectoryData, selectedActivity]);

  // Chart Data preparation based on selected horizon (6h, 12h, 24h)
  const chartData = useMemo(() => {
    if (!trajectoryData?.trajectory) return [];
    return trajectoryData.trajectory.slice(0, selectedHorizon).map((point) => {
      const subIdx = calcPM25SubIndex(point.predicted_pm25);
      const catInfo = subIdx !== null ? getNAQICategoryInfo(subIdx) : null;
      return {
        step: point.step,
        targetTimeUtc: point.target_time_utc,
        timeLabel: formatShortHour(point.target_time_utc),
        pm25: point.predicted_pm25,
        lowerBound: point.lower_bound_pm25,
        upperBound: point.upper_bound_pm25,
        category: catInfo?.category || 'Satisfactory',
        color: catInfo?.color || '#a3b593',
      };
    });
  }, [trajectoryData, selectedHorizon]);

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
          Loading Forecast &amp; Activity Planner...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#526b59' }}>
          Connecting to continuous monitoring stations and machine learning forecasting models
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.75rem 2.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(40, 122, 69, 0.1)',
                color: '#166534',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <TrendingUp size={13} />
              Forecast &amp; Activity Guidance
            </span>
            <span style={{ fontSize: '11px', color: '#526b59', fontWeight: 600 }}>Hourly Projections for Pune &amp; PCMC</span>
          </div>

          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: '#0d1710',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
            }}
          >
            Upcoming Air Quality &amp; Activity Guide
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#475e4e', maxWidth: '780px', lineHeight: 1.5 }}>
            Anticipate changes in air pollution across upcoming hours and schedule outdoor workouts, commutes,
            and children&apos;s play during periods of lower estimated exposure.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => selectedStationId && loadStationForecast(selectedStationId)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              color: '#166534',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
            }}
            title="Refresh forecast predictions"
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh Forecast'}</span>
          </button>
        </div>
      </div>

      {/* 2. Locality Selection Chips */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.5rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MapPin size={16} color="#166534" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1710', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Choose Your Pune or PCMC Locality:
          </span>
        </div>

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
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #166534' : '1px solid rgba(40, 122, 69, 0.2)',
                  background: isSelected ? '#166534' : 'rgba(255, 255, 255, 0.95)',
                  color: isSelected ? '#ffffff' : '#1e293b',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(22, 101, 52, 0.25)' : '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#ffffff' : 'rgba(40, 122, 69, 0.6)',
                  }}
                />
                <span>{st.station_name.split(',')[0]}</span>
                <span style={{ fontSize: '0.72rem', color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#64748b' }}>({st.city})</span>
              </button>
            );
          })}
        </div>

        {/* Locality disclaimer notice */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(240, 253, 244, 0.7)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            fontSize: '0.78rem',
            color: '#475e4e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={14} color="#166534" style={{ flexShrink: 0 }} />
          <span>
            Forecast applies specifically to the selected ambient monitoring station footprint ({selectedStation?.zone_type}).
            Hyper-local conditions near immediate traffic junctions may vary.
          </span>
        </div>
      </div>

      {/* 3. Three-Card Horizon & Current Conditions Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card A: Current Measured Observation */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '20px',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 6px 20px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Ground Observation
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: interpretation.currentObsIsStale ? 'rgba(250, 204, 21, 0.15)' : 'rgba(22, 101, 52, 0.1)',
                color: interpretation.currentObsIsStale ? '#b45309' : '#166534',
                border: interpretation.currentObsIsStale ? '1px solid rgba(250, 204, 21, 0.35)' : '1px solid rgba(22, 101, 52, 0.25)',
                fontWeight: 600,
              }}
            >
              {interpretation.currentObsIsStale ? 'Stale Reading' : 'Measured Reading'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0d1710', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {interpretation.currentObsPm25 !== null ? interpretation.currentObsPm25.toFixed(1) : '--'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>µg/m³ PM2.5</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
            Station: <strong style={{ color: '#0d1710' }}>{selectedStation?.station_name.split(',')[0]}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
            Timestamp: {formatISTTime(interpretation.currentObsTime)}
          </div>
        </div>

        {/* Card B: Expected Trajectory Trend */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '20px',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 6px 20px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Forecast Trend (Upcoming Hours)
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: `${interpretation.trendBadgeColor}18`,
                color: interpretation.trendBadgeColor,
                border: `1px solid ${interpretation.trendBadgeColor}40`,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {interpretation.trendLabel}
            </span>
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0d1710', margin: '6px 0', lineHeight: 1.45 }}>
            {interpretation.trendText}
          </div>

          {interpretation.peakHourLabel && interpretation.lowestHourLabel && (
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.76rem', color: '#526b59', marginTop: '8px' }}>
              <div>
                Peak: <strong style={{ color: '#dc2626' }}>{interpretation.peakHourLabel}</strong> (~{interpretation.peakPm25} µg/m³)
              </div>
              <div>
                Lowest: <strong style={{ color: '#15803d' }}>{interpretation.lowestHourLabel}</strong> (~{interpretation.lowestPm25} µg/m³)
              </div>
            </div>
          )}
        </div>

        {/* Card C: Model Initialization & Provenance */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '20px',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 6px 20px rgba(22, 38, 25, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Prediction Provenance
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                fontWeight: 600,
              }}
            >
              ML Model Forecast
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#0d1710', fontWeight: 700, margin: '6px 0 4px' }}>
            Model: Gradient Boosting Dispersion Baseline
          </div>
          <div style={{ fontSize: '0.76rem', color: '#475e4e' }}>
            Multi-horizon autoregressive anchor (1h to 24h)
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
            Initialized: {formatISTTime(interpretation.forecastInitTime)}
          </div>
        </div>
      </div>

      {/* 4. Upcoming Hourly Forecast Visualization & Chart */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#166534" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                Hourly Predicted PM2.5 Trajectory
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#526b59', marginTop: '2px' }}>
              Projected particulate concentrations over upcoming hours for {selectedStation?.station_name.split(',')[0]}
            </div>
          </div>

          {/* Horizon Selection Buttons (6h, 12h, 24h) */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(240, 253, 244, 0.8)',
              border: '1px solid rgba(40, 122, 69, 0.2)',
              borderRadius: '12px',
              padding: '3px',
            }}
          >
            {[
              { hours: 6, label: 'Next 6h' },
              { hours: 12, label: 'Next 12h' },
              { hours: 24, label: 'Next 24h' },
            ].map((h) => {
              const active = selectedHorizon === h.hours;
              return (
                <button
                  key={h.hours}
                  type="button"
                  onClick={() => setSelectedHorizon(h.hours)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '9px',
                    background: active ? '#166534' : 'transparent',
                    color: active ? '#ffffff' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 2px 6px rgba(22, 101, 52, 0.25)' : 'none',
                  }}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error or Unavailable Notification */}
        {forecastError && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{forecastError}</span>
          </div>
        )}

        {/* Recharts Area / Line Chart */}
        {chartData.length > 0 && (
          <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastPm25Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#166534" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 122, 69, 0.12)" vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#526b59"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(40, 122, 69, 0.2)' }}
                />
                <YAxis
                  stroke="#526b59"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(40, 122, 69, 0.2)' }}
                  unit=" µg"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.96)',
                            border: '1px solid rgba(40, 122, 69, 0.25)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            color: '#0d1710',
                            fontSize: '0.8rem',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                            {data.timeLabel} IST (Step +{data.step}h)
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d1710' }}>
                            {data.pm25.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>µg/m³ PM2.5</span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#526b59', marginTop: '2px' }}>
                            Particulate Tier: <strong style={{ color: data.color }}>{data.category}</strong>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                            * Model Forecast Estimate
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pm25"
                  stroke="#166534"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#forecastPm25Grad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Compact Hourly Pill Strip */}
        {chartData.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              paddingTop: '1rem',
              marginTop: '0.5rem',
              borderTop: '1px solid rgba(40, 122, 69, 0.15)',
            }}
          >
            {chartData.map((item) => (
              <div
                key={item.step}
                style={{
                  minWidth: '85px',
                  padding: '8px 10px',
                  borderRadius: '12px',
                  background: 'rgba(240, 253, 244, 0.75)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#526b59', fontWeight: 600 }}>{item.timeLabel}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d1710', margin: '3px 0' }}>
                  {item.pm25.toFixed(1)}
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: `${item.color}18`,
                    color: item.color,
                  }}
                >
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Data Integrity Footnote (Section 6 Requirement) */}
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(40, 122, 69, 0.12)',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.45,
          }}
        >
          * <strong>Methodology Note:</strong> Predicted concentrations represent machine learning model forecasts of ambient PM2.5.
          Hourly predictions are particulate-based estimates and do not represent the official CPCB National Air Quality Index (NAQI),
          which requires a minimum of 3 criteria pollutants (including mandatory PM2.5 or PM10) evaluated over a 24-hour averaging period.
        </div>
      </div>

      {/* 5. Plan Your Activities Section (Section 7 Requirement) */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#166534" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                Plan Your Activities
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#526b59', marginTop: '2px' }}>
              Actionable outdoor guidance tailored to your selected locality&apos;s forecast trajectory
            </div>
          </div>

          <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
            Select an activity to view guidance
          </span>
        </div>

        {/* Activity Selection Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: '1.25rem',
          }}
        >
          {[
            { type: 'exercise' as ActivityType, label: 'Outdoor Exercise & Running', icon: <Activity size={18} /> },
            { type: 'walking' as ActivityType, label: 'Walking & Outdoor Errands', icon: <Footprints size={18} /> },
            { type: 'children' as ActivityType, label: "Children's Outdoor Play", icon: <Smile size={18} /> },
          ].map((act) => {
            const active = selectedActivity === act.type;
            return (
              <button
                key={act.type}
                type="button"
                onClick={() => setSelectedActivity(act.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: active ? '1.5px solid #166534' : '1px solid rgba(40, 122, 69, 0.2)',
                  background: active ? 'rgba(40, 122, 69, 0.12)' : 'rgba(255, 255, 255, 0.95)',
                  color: active ? '#166534' : '#334155',
                  fontSize: '0.84rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 2px 8px rgba(22, 101, 52, 0.15)' : 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', color: active ? '#166534' : '#526b59' }}>{act.icon}</span>
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Activity Guidance Card */}
        <div
          style={{
            background: 'rgba(240, 253, 244, 0.75)',
            border: '1px solid rgba(40, 122, 69, 0.2)',
            borderRadius: '18px',
            padding: '1.4rem 1.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0d1710' }}>
              {interpretation.activeGuidance.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: `${interpretation.activeGuidance.badgeColor}18`,
                  color: interpretation.activeGuidance.badgeColor,
                  border: `1px solid ${interpretation.activeGuidance.badgeColor}40`,
                }}
              >
                {interpretation.activeGuidance.badge}
              </span>
            </div>
          </div>

          {/* Recommended Time Window */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(40, 122, 69, 0.2)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#166534" />
              <span style={{ fontSize: '0.8rem', color: '#526b59', fontWeight: 600 }}>
                Suggested Window:
              </span>
              <strong style={{ fontSize: '0.92rem', color: '#0d1710' }}>
                {interpretation.activeGuidance.bestTimeWindow}
              </strong>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
              {interpretation.activeGuidance.timingReason}
            </span>
          </div>

          {/* Guidance Paragraph */}
          <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#334155', lineHeight: 1.55 }}>
            {interpretation.activeGuidance.guidanceText}
          </p>

          {/* Medical & Safety Non-Warranty Disclosure */}
          <div
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              lineHeight: 1.4,
              fontStyle: 'italic',
              borderTop: '1px solid rgba(40, 122, 69, 0.15)',
              paddingTop: '8px',
            }}
          >
            * AirLens provides environmental model predictions to help compare exposure timing. No outdoor window is guaranteed completely clean.
            These observations do not constitute personalized medical advice.
          </div>
        </div>

        {/* 6. Max 3 Practical Locality Recommendations (Section 8 Requirement) */}
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Practical Locality Recommendations ({selectedStation?.station_name.split(',')[0]}):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {interpretation.practicalRecommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  fontSize: '0.84rem',
                  color: '#334155',
                  lineHeight: 1.45,
                }}
              >
                <CheckCircle2 size={16} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
