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
  Layers,
  BarChart3,
  Waves,
  Eye,
  Leaf,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
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

  // State: Chart Appearance & Interaction
  const [chartViewMode, setChartViewMode] = useState<'area' | 'bars' | 'confidence'>('area');
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [activeHourStep, setActiveHourStep] = useState<number | null>(null);

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

  // Comprehensive Statistics & Optimal Window Calculation
  const chartStats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const pmValues = chartData.map((d) => d.pm25);
    const minVal = Math.min(...pmValues);
    const maxVal = Math.max(...pmValues);
    const minItem = chartData.find((d) => d.pm25 === minVal);
    const maxItem = chartData.find((d) => d.pm25 === maxVal);
    const avgVal = pmValues.reduce((a, b) => a + b, 0) / pmValues.length;
    const safeCount = chartData.filter((d) => d.pm25 <= 60).length;
    const safePercentage = Math.round((safeCount / chartData.length) * 100);

    // Find best consecutive 3-hour window for outdoor activities
    let bestWindowStart = 0;
    let bestWindowAvg = Infinity;
    const windowSize = Math.min(3, chartData.length);
    for (let i = 0; i <= chartData.length - windowSize; i++) {
      let windowSum = 0;
      for (let j = 0; j < windowSize; j++) {
        windowSum += chartData[i + j].pm25;
      }
      const windowAvg = windowSum / windowSize;
      if (windowAvg < bestWindowAvg) {
        bestWindowAvg = windowAvg;
        bestWindowStart = i;
      }
    }

    const bestWindow =
      chartData.length >= windowSize
        ? {
            startTime: chartData[bestWindowStart].timeLabel,
            endTime: chartData[Math.min(chartData.length - 1, bestWindowStart + windowSize - 1)].timeLabel,
            avg: bestWindowAvg.toFixed(1),
          }
        : null;

    return {
      min: minVal.toFixed(1),
      minTime: minItem?.timeLabel || '',
      max: maxVal.toFixed(1),
      maxTime: maxItem?.timeLabel || '',
      avg: avgVal.toFixed(1),
      safePercentage,
      bestWindow,
    };
  }, [chartData]);

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
          background: 'radial-gradient(ellipse at 85% 0%, rgba(34, 197, 94, 0.07) 0%, transparent 60%), radial-gradient(ellipse at 15% 100%, rgba(245, 158, 11, 0.05) 0%, transparent 50%), rgba(255, 255, 255, 0.97)',
          border: '1.5px solid rgba(40, 122, 69, 0.22)',
          borderRadius: '28px',
          padding: '2rem 2.25rem',
          marginBottom: '1.75rem',
          boxShadow: '0 16px 48px rgba(22, 38, 25, 0.07), 0 2px 8px rgba(0, 0, 0, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'relative',
        }}
      >
        {/* Top Header & Multi-Mode Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(22, 101, 52, 0.12)',
                  color: '#166534',
                }}
              >
                <Clock size={16} />
              </span>
              <h2
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  margin: 0,
                  color: '#0d1710',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                Hourly Predicted PM2.5 Trajectory
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#166534',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                }}
              >
                AI Simulation
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#526b59', marginLeft: '37px' }}>
              Projected particulate dispersion across upcoming hours for{' '}
              <strong style={{ color: '#0d1710' }}>{selectedStation?.station_name.split(',')[0]}</strong>
            </div>
          </div>

          {/* Controls Cluster: Mode Switcher + Horizon Selector + Guidelines */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(240, 253, 244, 0.85)',
                border: '1px solid rgba(40, 122, 69, 0.22)',
                borderRadius: '12px',
                padding: '3px',
                gap: '2px',
              }}
            >
              {[
                { mode: 'area', label: 'Wave Glow', icon: <Waves size={13} /> },
                { mode: 'bars', label: 'AQI Bars', icon: <BarChart3 size={13} /> },
                { mode: 'confidence', label: 'Confidence', icon: <Layers size={13} /> },
              ].map((m) => {
                const active = chartViewMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setChartViewMode(m.mode as any)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 11px',
                      border: 'none',
                      borderRadius: '9px',
                      background: active ? '#166534' : 'transparent',
                      color: active ? '#ffffff' : '#334155',
                      fontSize: '0.76rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
                    }}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Horizon Selection Buttons (6h, 12h, 24h) */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(240, 253, 244, 0.85)',
                border: '1px solid rgba(40, 122, 69, 0.22)',
                borderRadius: '12px',
                padding: '3px',
                gap: '2px',
              }}
            >
              {[
                { hours: 6, label: '6h' },
                { hours: 12, label: '12h' },
                { hours: 24, label: '24h' },
              ].map((h) => {
                const active = selectedHorizon === h.hours;
                return (
                  <button
                    key={h.hours}
                    type="button"
                    onClick={() => setSelectedHorizon(h.hours)}
                    style={{
                      padding: '6px 11px',
                      border: 'none',
                      borderRadius: '9px',
                      background: active ? '#166534' : 'transparent',
                      color: active ? '#ffffff' : '#334155',
                      fontSize: '0.76rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
                    }}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>

            {/* Threshold Guides Toggle */}
            <button
              type="button"
              onClick={() => setShowThresholds(!showThresholds)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '12px',
                border: showThresholds ? '1px solid #166534' : '1px solid rgba(40, 122, 69, 0.22)',
                background: showThresholds ? 'rgba(22, 101, 52, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                color: showThresholds ? '#166534' : '#64748b',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Toggle CPCB safe limit & pristine reference lines"
            >
              <Eye size={13} color={showThresholds ? '#166534' : '#94a3b8'} />
              <span>CPCB Limits</span>
            </button>
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

        {/* Intelligent AI Window & Key Metrics Advisory Ribbon */}
        {chartStats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
              marginBottom: '1.5rem',
            }}
          >
            {/* Ribbon Card 1: Optimal Window */}
            {chartStats.bestWindow && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(220, 252, 231, 0.6) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#166534',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(22, 101, 52, 0.25)',
                  }}
                >
                  <Leaf size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Cleanest Outdoor Window
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0d1710' }}>
                    {chartStats.bestWindow.startTime} – {chartStats.bestWindow.endTime}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                    Avg: ~{chartStats.bestWindow.avg} µg/m³ • Best for jogging &amp; sports
                  </div>
                </div>
              </div>
            )}

            {/* Ribbon Card 2: Peak Spike Advisory */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.8) 0%, rgba(254, 242, 242, 0.6) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#d97706',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(217, 119, 6, 0.25)',
                }}
              >
                <Flame size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Projected Peak Spike
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0d1710' }}>
                  {chartStats.maxTime} (~{chartStats.max} µg/m³)
                </div>
                <div style={{ fontSize: '0.74rem', color: '#b45309' }}>
                  Elevated concentration • Keep car &amp; home windows closed
                </div>
              </div>
            </div>

            {/* Ribbon Card 3: Horizon Summary Metrics */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.9) 0%, rgba(224, 242, 254, 0.6) 100%)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
                }}
              >
                <Activity size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {selectedHorizon}h Horizon Metrics
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Average: </span>
                    <strong style={{ fontSize: '0.86rem', color: '#0d1710' }}>{chartStats.avg} µg</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Within CPCB: </span>
                    <strong style={{ fontSize: '0.86rem', color: chartStats.safePercentage >= 60 ? '#166534' : '#b45309' }}>
                      {chartStats.safePercentage}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elevated Interactive Recharts Visual Canvas */}
        {chartData.length > 0 && (
          <div style={{ width: '100%', height: '340px', marginTop: '10px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                <defs>
                  {/* Dynamic Multi-Stop Gradient Fill for Area Mode */}
                  <linearGradient id="forecastDynamicGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="35%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="75%" stopColor="#059669" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Gradient for Upper/Lower Uncertainty Band */}
                  <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.03} />
                  </linearGradient>

                  {/* Dynamic Line Stroke Gradient */}
                  <linearGradient id="lineStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="40%" stopColor="#059669" />
                    <stop offset="75%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>

                  {/* Neon Glow Filter */}
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 122, 69, 0.12)" vertical={false} />

                <XAxis
                  dataKey="timeLabel"
                  stroke="#526b59"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(40, 122, 69, 0.22)' }}
                  dy={6}
                />

                <YAxis
                  stroke="#526b59"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(40, 122, 69, 0.22)' }}
                  unit=" µg"
                  domain={[0, (dataMax: number) => Math.ceil((dataMax + 12) / 10) * 10]}
                />

                {/* CPCB National Air Quality Safe Limit Guidelines */}
                {showThresholds && (
                  <>
                    <ReferenceLine
                      y={60}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: 'CPCB 24h Limit (60 µg/m³)',
                        position: 'insideTopRight',
                        fill: '#b45309',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 8,
                      }}
                    />
                    <ReferenceLine
                      y={30}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1.2}
                      label={{
                        value: 'Safe Baseline (30 µg/m³)',
                        position: 'insideBottomRight',
                        fill: '#047857',
                        fontSize: 9.5,
                        fontWeight: 700,
                        offset: 6,
                      }}
                    />
                  </>
                )}

                {/* State-of-the-Art Glassmorphic Tooltip */}
                <Tooltip
                  cursor={{ stroke: 'rgba(22, 101, 52, 0.35)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      const groundObs = interpretation.currentObsPm25;
                      const delta = groundObs !== null ? data.pm25 - groundObs : null;
                      return (
                        <div
                          style={{
                            background: 'rgba(15, 23, 42, 0.94)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            borderRadius: '16px',
                            padding: '14px 18px',
                            color: '#ffffff',
                            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            minWidth: '240px',
                          }}
                        >
                          {/* Tooltip Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                              <Clock size={13} color="#38bdf8" />
                              <span>{data.timeLabel} IST</span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Step +{data.step}h)</span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: `${data.color}25`,
                                color: data.color,
                                border: `1px solid ${data.color}50`,
                              }}
                            >
                              {data.category}
                            </span>
                          </div>

                          {/* PM2.5 Big Number */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1 }}>
                              {data.pm25.toFixed(1)}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>µg/m³ PM2.5</span>
                          </div>

                          {/* Delta comparison vs ground reading */}
                          {delta !== null && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                marginTop: '4px',
                                color: delta > 0 ? '#f87171' : '#4ade80',
                                fontWeight: 600,
                              }}
                            >
                              {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              <span>
                                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} µg/m³ vs ground measured
                              </span>
                            </div>
                          )}

                          {/* Confidence Interval */}
                          {data.lowerBound !== undefined && data.upperBound !== undefined && (
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                marginTop: '8px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                paddingTop: '6px',
                              }}
                            >
                              Model Confidence Band: <strong style={{ color: '#38bdf8' }}>{data.lowerBound.toFixed(1)} – {data.upperBound.toFixed(1)}</strong> µg/m³
                            </div>
                          )}

                          {/* Actionable recommendation */}
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#e2e8f0',
                              marginTop: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              padding: '6px 8px',
                            }}
                          >
                            {data.pm25 <= 30
                              ? '🌿 Pristine air: Ideal for intense cardio & jogging'
                              : data.pm25 <= 60
                              ? '🏃 Satisfactory: Safe for general outdoor exercise'
                              : data.pm25 <= 90
                              ? '🛡️ Moderate: Limit strenuous workouts near traffic corridors'
                              : '⚠️ Elevated: Wear N95 outdoors & exercise inside'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Mode 1: Wave Glow Spline Area */}
                {chartViewMode === 'area' && (
                  <Area
                    type="monotone"
                    dataKey="pm25"
                    stroke="url(#lineStrokeGrad)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#forecastDynamicGrad)"
                    filter="url(#neonGlow)"
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (!cx || !cy || !payload) {
                        return <g key={`dot-empty-${index}`} />;
                      }
                      const isMax = chartStats && payload.pm25 === Number(chartStats.max);
                      const isMin = chartStats && payload.pm25 === Number(chartStats.min);
                      const isSelected = activeHourStep === payload.step;

                      if (isSelected) {
                        return (
                          <g key={`dot-sel-${payload.step}`}>
                            <circle cx={cx} cy={cy} r={10} fill={payload.color} fillOpacity={0.35} />
                            <circle cx={cx} cy={cy} r={5.5} fill="#ffffff" stroke={payload.color} strokeWidth={2.5} />
                          </g>
                        );
                      }
                      if (isMax) {
                        return (
                          <g key={`dot-max-${payload.step}`}>
                            <circle cx={cx} cy={cy} r={8} fill="#ef4444" fillOpacity={0.3} />
                            <circle cx={cx} cy={cy} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                          </g>
                        );
                      }
                      if (isMin) {
                        return (
                          <g key={`dot-min-${payload.step}`}>
                            <circle cx={cx} cy={cy} r={8} fill="#10b981" fillOpacity={0.3} />
                            <circle cx={cx} cy={cy} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                          </g>
                        );
                      }
                      return <g key={`dot-noop-${payload.step || index}`} />;
                    }}
                    activeDot={{
                      r: 7,
                      stroke: '#ffffff',
                      strokeWidth: 2.5,
                      fill: '#166534',
                    }}
                  />
                )}

                {/* Mode 2: AQI Tier Spectrum Bars */}
                {chartViewMode === 'bars' && (
                  <Bar
                    dataKey="pm25"
                    radius={[8, 8, 0, 0]}
                    animationDuration={600}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={activeHourStep === null || activeHourStep === entry.step ? 0.9 : 0.35}
                        stroke={activeHourStep === entry.step ? '#0d1710' : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                )}

                {/* Mode 3: ML Confidence Range Band */}
                {chartViewMode === 'confidence' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      stroke="#0284c7"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#confidenceGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="lowerBound"
                      stroke="#0284c7"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={0}
                      fill="transparent"
                    />
                    <Line
                      type="monotone"
                      dataKey="pm25"
                      stroke="#166534"
                      strokeWidth={3}
                      dot={{ r: 3.5, fill: '#166534', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#166534', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Interactive Hourly Glass Tiles (Click to inspect or highlight specific hour) */}
        {chartData.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hourly Trajectory Breakdown (Click any hour to focus):
              </span>
              {activeHourStep !== null && (
                <button
                  type="button"
                  onClick={() => setActiveHourStep(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#166534',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '8px',
                paddingTop: '2px',
              }}
            >
              {chartData.map((item) => {
                const isSelected = activeHourStep === item.step;
                const isMax = chartStats && item.pm25 === Number(chartStats.max);
                const isMin = chartStats && item.pm25 === Number(chartStats.min);

                return (
                  <div
                    key={item.step}
                    onClick={() => setActiveHourStep(isSelected ? null : item.step)}
                    style={{
                      minWidth: '92px',
                      padding: '10px 10px 8px',
                      borderRadius: '16px',
                      background: isSelected
                        ? 'rgba(255, 255, 255, 1)'
                        : 'rgba(240, 253, 244, 0.65)',
                      border: isSelected
                        ? `2px solid ${item.color}`
                        : '1px solid rgba(40, 122, 69, 0.18)',
                      borderTop: `4px solid ${item.color}`,
                      textAlign: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isSelected ? 'translateY(-4px) scale(1.03)' : 'translateY(0)',
                      boxShadow: isSelected
                        ? `0 10px 24px rgba(0, 0, 0, 0.12), 0 0 12px ${item.color}30`
                        : '0 2px 6px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#526b59', fontWeight: 600 }}>
                      {item.timeLabel}
                    </div>

                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d1710', margin: '3px 0 4px', letterSpacing: '-0.02em' }}>
                      {item.pm25.toFixed(1)}
                    </div>

                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: `${item.color}20`,
                        color: item.color,
                        display: 'inline-block',
                      }}
                    >
                      {item.category}
                    </span>

                    {/* Peak / Cleanest Badge Tag */}
                    {isMax && (
                      <div style={{ fontSize: '8px', color: '#dc2626', fontWeight: 800, marginTop: '4px' }}>
                        ▲ PEAK
                      </div>
                    )}
                    {isMin && (
                      <div style={{ fontSize: '8px', color: '#16a34a', fontWeight: 800, marginTop: '4px' }}>
                        ▼ CLEANEST
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Integrity Footnote (Section 6 Requirement) */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid rgba(40, 122, 69, 0.12)',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={14} color="#526b59" style={{ flexShrink: 0 }} />
          <span>
            <strong>Methodology Note:</strong> Predicted concentrations represent machine learning model forecasts of ambient PM2.5.
            Hourly predictions are particulate-based estimates and do not represent the official CPCB National Air Quality Index (NAQI),
            which requires a minimum of 3 criteria pollutants (including mandatory PM2.5 or PM10) evaluated over a 24-hour averaging period.
          </span>
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
