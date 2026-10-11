import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Heart,
  Wind,
  Shield,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Activity,
  Info,
  Mic,
} from 'lucide-react';

import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getForecastTrajectory } from '../api/forecast';
import { getActiveAlerts } from '../api/alerts';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { ForecastTrajectoryResponse, TrajectoryPoint } from '../types/forecast';
import { AlertItem } from '../types/alert';
import { PuneTwinMap } from '../components/map/PuneTwinMap';
import { VapiVoiceAssistant } from '../components/voice/VapiVoiceAssistant';

// Centralized Official Indian CPCB NAQI and Particulate evaluation module
import {
  NAQICategory,
  CategoryInfo,
  getNAQICategoryInfo,
  calcPM25SubIndex,
  calcPM10SubIndex,
  calcNO2SubIndex,
  calcSO2SubIndex,
  calcCOSubIndex,
  calcO3SubIndex,
  EvaluatedAirQuality,
  evaluateAirQuality,
  calculateAQI,
} from '../utils/aqi';

export type { NAQICategory, CategoryInfo, EvaluatedAirQuality };
export {
  getNAQICategoryInfo,
  calcPM25SubIndex,
  calcPM10SubIndex,
  calcNO2SubIndex,
  calcSO2SubIndex,
  calcCOSubIndex,
  calcO3SubIndex,
  evaluateAirQuality,
  calculateAQI,
};

export const CitizenPortal: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [latestObs, setLatestObs] = useState<ObservationItem | null>(null);
  const [allStationsObs, setAllStationsObs] = useState<Record<number, ObservationItem | null>>({});
  const [forecastTrajectory, setForecastTrajectory] = useState<ForecastTrajectoryResponse | null>(null);
  const [forecastUnavailable, setForecastUnavailable] = useState<boolean>(false);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState<boolean>(false);

  // 1. Load Station Network
  useEffect(() => {
    let isMounted = true;
    const fetchStationNetwork = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await getStations(true);
        if (isMounted) {
          setStations(data);
          if (data.length > 0 && selectedStationId === null) {
            setSelectedStationId(data[0].station_id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError('Unable to connect to air quality network. Please ensure the backend service is running.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStationNetwork();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Telemetry & Forecast for Selected Station
  const loadStationData = useCallback(async (stId: number) => {
    setIsRefreshing(true);
    try {
      // A. Real latest observation
      const obsPromise = getObservations(stId, { limit: 1, order: 'desc' })
        .then((res) => (res.items.length > 0 ? res.items[0] : null))
        .catch(() => null);

      // B. Real forecast trajectory
      const forecastPromise = getForecastTrajectory(stId, { horizon_hours: 6 })
        .then((res) => {
          setForecastUnavailable(false);
          return res;
        })
        .catch(() => {
          setForecastUnavailable(true);
          return null;
        });

      // C. Active alerts for this station
      const alertsPromise = getActiveAlerts(stId).catch(() => []);

      const [obs, forecast, alerts] = await Promise.all([obsPromise, forecastPromise, alertsPromise]);

      setLatestObs(obs);
      setForecastTrajectory(forecast);
      setActiveAlerts(alerts);

      // Also update map marker observation
      if (obs) {
        setAllStationsObs((prev) => ({ ...prev, [stId]: obs }));
      }
    } catch {
      // Non-fatal fallback
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch observations for other stations to populate map markers
  useEffect(() => {
    if (stations.length === 0) return;
    stations.forEach((st) => {
      if (allStationsObs[st.station_id] === undefined) {
        getObservations(st.station_id, { limit: 1, order: 'desc' })
          .then((res) => {
            if (res.items.length > 0) {
              setAllStationsObs((prev) => ({ ...prev, [st.station_id]: res.items[0] }));
            }
          })
          .catch(() => {});
      }
    });
  }, [stations]);

  useEffect(() => {
    if (selectedStationId) {
      loadStationData(selectedStationId);
    }
  }, [selectedStationId, loadStationData]);

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) || stations[0] || null;

  // Evaluate genuine air quality according to official CPCB rules and particulate estimate
  const airQualityEval = evaluateAirQuality(latestObs);

  // Format timestamp in local IST
  const formatTimestamp = (isoString?: string | null) => {
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

  // Determine forecast trend
  const getForecastTrend = (trajectory?: TrajectoryPoint[]) => {
    if (!trajectory || trajectory.length < 2 || latestObs?.pm25 === null || latestObs?.pm25 === undefined) return null;
    const current = latestObs.pm25;
    const nextSteps = trajectory.slice(0, 3);
    const avgNext = nextSteps.reduce((acc, step) => acc + step.predicted_pm25, 0) / nextSteps.length;
    const diff = avgNext - current;

    if (diff < -3) {
      return {
        type: 'improving',
        label: 'Expected Improvement',
        text: 'Particulate concentrations are projected to decrease over upcoming hours based on forecast models.',
        icon: <TrendingDown size={16} color="#4ade80" />,
        badgeColor: '#4ade80',
      };
    } else if (diff > 3) {
      return {
        type: 'deteriorating',
        label: 'Expected Deterioration',
        text: 'Particulate concentrations are projected to increase over upcoming hours based on forecast models.',
        icon: <TrendingUp size={16} color="#fb923c" />,
        badgeColor: '#fb923c',
      };
    }
    return {
      type: 'steady',
      label: 'Steady Conditions',
      text: 'Particulate levels are projected to remain relatively consistent over the upcoming hours.',
      icon: <Minus size={16} color="#a3b593" />,
      badgeColor: '#a3b593',
    };
  };

  const trend = forecastTrajectory?.trajectory ? getForecastTrend(forecastTrajectory.trajectory) : null;

  // Data-dependent recommendations based strictly on available measured pollutant concentrations
  const getRecommendations = () => {
    if (!latestObs || latestObs.pm25 === null || latestObs.pm25 === undefined) {
      return [
        {
          title: 'Awaiting Observation Data',
          desc: 'Current pollutant readings are updating for this station. Recommendations will generate once verified data is received.',
          icon: <Info size={18} />,
          color: '#a3b593',
        },
      ];
    }

    const pm25 = latestObs.pm25;
    const recs: { title: string; desc: string; icon: React.ReactNode; color: string }[] = [];

    if (pm25 <= 30) {
      // Good (< 30 µg/m³)
      recs.push({
        title: 'Outdoor Activities & Exercise',
        desc: 'Current particulate levels are low. Favorable conditions for regular outdoor routines and walks.',
        icon: <CheckCircle2 size={18} />,
        color: '#4ade80',
      });
      recs.push({
        title: 'Children & Schools',
        desc: 'Favorable conditions for routine outdoor playtime and physical education sessions.',
        icon: <Heart size={18} />,
        color: '#4ade80',
      });
      recs.push({
        title: 'Home Ventilation',
        desc: 'Suitable conditions to open windows and air out indoor living spaces.',
        icon: <Wind size={18} />,
        color: '#60a5fa',
      });
    } else if (pm25 <= 60) {
      // Satisfactory (31 - 60 µg/m³)
      recs.push({
        title: 'Outdoor Exercise',
        desc: 'Particulate concentrations are acceptable for most residents. Check station trends before long workouts.',
        icon: <Activity size={18} />,
        color: '#a3b593',
      });
      recs.push({
        title: 'Sensitive Groups & Children',
        desc: 'Generally suitable for outdoor activity, though individuals unusually sensitive to dust should monitor how they feel.',
        icon: <Heart size={18} />,
        color: '#a3b593',
      });
      recs.push({
        title: 'Indoor Ventilation',
        desc: 'Conditions are generally acceptable for regular daytime ventilation.',
        icon: <Wind size={18} />,
        color: '#60a5fa',
      });
    } else if (pm25 <= 90) {
      // Moderate (61 - 90 µg/m³)
      recs.push({
        title: 'Exercise & Outdoor Activity',
        desc: 'Moderate particulate levels. If you experience irritation or shortness of breath, consider reducing prolonged heavy exertion.',
        icon: <Activity size={18} />,
        color: '#facc15',
      });
      recs.push({
        title: 'Sensitive Groups & Seniors',
        desc: 'People with asthma or respiratory conditions should consider pacing outdoor physical activity.',
        icon: <Shield size={18} />,
        color: '#facc15',
      });
      recs.push({
        title: 'Activity Planning',
        desc: 'Check the next-hour forecast trajectory to choose periods when particle levels are projected to be lower.',
        icon: <Clock size={18} />,
        color: '#a3b593',
      });
    } else if (pm25 <= 120) {
      // Poor (91 - 120 µg/m³)
      recs.push({
        title: 'Reduce Prolonged Outdoor Activity',
        desc: 'Elevated particle concentrations observed. Consider moving strenuous workouts indoors.',
        icon: <AlertTriangle size={18} />,
        color: '#fb923c',
      });
      recs.push({
        title: 'Children & Respiratory Sensitivities',
        desc: 'Children and sensitive groups should reduce extended outdoor playtime and keep inhalers accessible.',
        icon: <Shield size={18} />,
        color: '#fb923c',
      });
      recs.push({
        title: 'Indoor Air & Windows',
        desc: 'Consider keeping windows closed during peak haze hours to reduce outdoor dust penetration.',
        icon: <Wind size={18} />,
        color: '#fb923c',
      });
    } else {
      // Very Poor / Severe (> 120 µg/m³)
      recs.push({
        title: 'Avoid Heavy Outdoor Exertion',
        desc: 'Particulate pollution is significantly elevated. Postpone strenuous outdoor exercise or exercise indoors.',
        icon: <AlertTriangle size={18} />,
        color: '#f87171',
      });
      recs.push({
        title: 'Vulnerable Groups & Children',
        desc: 'Children, seniors, and those with cardiopulmonary conditions should avoid extended outdoor exposure.',
        icon: <Shield size={18} />,
        color: '#f87171',
      });
      recs.push({
        title: 'Indoor Air Protection',
        desc: 'Keep windows and doors closed to maintain better indoor air quality until dispersion improves.',
        icon: <Wind size={18} />,
        color: '#ef4444',
      });
    }

    return recs.slice(0, 3);
  };

  const recommendations = getRecommendations();

  if (isLoading && stations.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '16px',
          color: '#a3b593',
        }}
      >
        <RefreshCw size={36} style={{ animation: 'spin 1.5s linear infinite' }} />
        <h3 style={{ margin: 0, color: '#f4f6f0', fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
          Loading Air Quality Network...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#9eab93' }}>
          Connecting to Pune environmental monitoring stations
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Introduction Header Banner */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '2rem 2.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 12px 36px rgba(22, 38, 25, 0.05)',
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
                background: 'rgba(40, 122, 69, 0.1)',
                color: '#166534',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Heart size={13} />
              My Air Dashboard
            </span>
            <span style={{ fontSize: '11px', color: '#526b59' }}>Pune &amp; Pimpri-Chinchwad Metropolitan Area</span>
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
            How is the air in your neighborhood today?
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#475e4e', maxWidth: '720px', lineHeight: 1.5 }}>
            Real-time, zero-jargon air quality insights and practical recommendations for your family, daily exercise, and commute.
          </p>
        </div>

        {/* Refresh & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => selectedStationId && loadStationData(selectedStationId)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(40, 122, 69, 0.08)',
              border: '1px solid rgba(40, 122, 69, 0.22)',
              color: '#166534',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Refresh latest telemetry readings"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>

          <Link
            to="/digital-twin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: '#166534',
              border: '1px solid #14532d',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            title="View 3D Interactive Digital Twin"
          >
            <Sparkles size={13} />
            <span>3D Twin View</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.9rem' }}>{loadError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Unobtrusive Conversational Voice Assistant Accordion */}
      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '18px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 30px rgba(22, 38, 25, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setVoiceAssistantOpen(!voiceAssistantOpen)}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            color: '#0d1710',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          aria-expanded={voiceAssistantOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(40, 122, 69, 0.12)',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0d1710' }}>
                AirLens Voice Assistant
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475e4e' }}>
                Ask spoken or typed questions about workouts, sensitive health advisories, or clean travel
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
            <span>{voiceAssistantOpen ? 'Hide Assistant' : 'Ask Question'}</span>
            {voiceAssistantOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {voiceAssistantOpen && (
          <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(40, 122, 69, 0.12)' }}>
            <VapiVoiceAssistant
              stationName={selectedStation ? selectedStation.station_name : 'Pune Urban Area'}
              pm25={latestObs?.pm25 ?? null}
              aqiCategory={airQualityEval.particulateCategory || 'Awaiting Data'}
            />
          </div>
        )}
      </div>

      {/* Locality & Station Selector Chips */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <MapPin size={16} color="#166534" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Your Pune Neighborhood Monitoring Station:
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
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #14532d' : '1px solid rgba(40, 122, 69, 0.2)',
                  background: isSelected
                    ? '#166534'
                    : 'rgba(255, 255, 255, 0.85)',
                  color: isSelected ? '#ffffff' : '#1e3a24',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 14px rgba(22, 101, 52, 0.25)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#ffffff' : '#166534',
                  }}
                />
                <span>{st.station_name.split(',')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION E: ACTIVE ALERTS (Displayed ONLY if real active alerts exist for selected locality) */}
      {activeAlerts.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1.75rem',
            padding: '1.25rem 1.75rem',
            borderRadius: '20px',
            background: 'rgba(254, 243, 199, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#d97706" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Local Environmental Alert ({activeAlerts.length})
              </span>
            </div>
            <Link
              to="/alerts"
              style={{
                fontSize: '0.78rem',
                color: '#b45309',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View All Alerts Details</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeAlerts.slice(0, 2).map((alt) => (
              <div
                key={alt.alert_id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0d1710' }}>
                    {alt.message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78350f', marginTop: '2px' }}>
                    Type: {alt.alert_type.replace(/_/g, ' ')} · Severity: {alt.severity}
                  </div>
                </div>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: alt.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                    color: alt.severity === 'HIGH' ? '#dc2626' : '#b45309',
                    border: `1px solid ${alt.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {alt.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN GRID: SECTION A (CURRENT AQI) & SECTION C (RECOMMENDATIONS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.75rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* SECTION A: CURRENT AIR QUALITY */}
        <div
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(22, 38, 25, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Header: Station & Simplified Provenance Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: latestObs?.data_provenance === 'OBSERVED' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(40, 122, 69, 0.1)',
                      color: latestObs?.data_provenance === 'OBSERVED' ? '#15803d' : '#166534',
                      border: '1px solid rgba(40, 122, 69, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: latestObs?.data_provenance === 'OBSERVED' ? '#15803d' : '#166534' }} />
                    {latestObs?.data_provenance === 'OBSERVED' ? 'Measured reading' : 'Model estimate'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#526b59' }}>
                    {latestObs?.data_provenance === 'OBSERVED'
                      ? 'Direct sensor reading from this station'
                      : 'Statistical estimate from neighboring station network'}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '2px 0 0', color: '#0d1710' }}>
                  {selectedStation ? selectedStation.station_name : 'Monitoring Station'}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#475e4e' }}>
                  {selectedStation ? selectedStation.zone_type : 'Pune Metropolitan Region'}
                </div>
              </div>

              {/* Category Pill */}
              {airQualityEval.hasParticulateEstimate ? (
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: `${airQualityEval.particulateColor || '#166534'}20`,
                    color: airQualityEval.particulateColor || '#166534',
                    border: `1.5px solid ${airQualityEval.particulateColor || '#166534'}`,
                    boxShadow: `0 0 16px ${airQualityEval.particulateColor || '#166534'}25`,
                  }}
                >
                  {airQualityEval.particulateCategory} Air
                </span>
              ) : (
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(40, 122, 69, 0.08)',
                    color: '#526b59',
                    border: '1.5px solid rgba(40, 122, 69, 0.18)',
                  }}
                >
                  Awaiting Data
                </span>
              )}
            </div>

            {/* Official CPCB AQI Status Banner */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: airQualityEval.isOfficialAqiAvailable ? 'rgba(240, 253, 244, 0.9)' : 'rgba(248, 250, 248, 0.9)',
                border: '1px solid rgba(40, 122, 69, 0.16)',
                marginBottom: '1rem',
                fontSize: '0.76rem',
                color: '#1b432a',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Info size={14} color="#166534" style={{ flexShrink: 0 }} />
              <span>
                {airQualityEval.isOfficialAqiAvailable ? (
                  <>
                    <strong>Official CPCB NAQI:</strong> {airQualityEval.officialAqi} ({airQualityEval.officialCategory}) — Prominent: {airQualityEval.prominentPollutant}
                  </>
                ) : (
                  <>
                    <strong>Official Overall CPCB AQI:</strong> Unavailable ({airQualityEval.officialUnavailableReason})
                  </>
                )}
              </span>
            </div>

            {/* Prominent Particulate Estimate Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.4rem 1.6rem',
                borderRadius: '20px',
                background: 'rgba(245, 248, 245, 0.95)',
                border: '1px solid rgba(40, 122, 69, 0.16)',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: '#475e4e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Particulate-Based Air Index (Estimate)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                  <span
                    style={{
                      fontSize: '3.6rem',
                      fontWeight: 800,
                      color: airQualityEval.particulateColor || '#166534',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {airQualityEval.particulateIndex ?? '--'}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#475e4e', fontWeight: 600 }}>/ 500</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#526b59', marginTop: '4px' }}>
                  Calculated from available {airQualityEval.prominentParticulate || 'PM2.5'} using CPCB sub-index scale
                </div>
              </div>

              {/* Sub-pollutants (PM2.5 and PM10) distinct from AQI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(40, 122, 69, 0.14)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: '#526b59', textTransform: 'uppercase', fontWeight: 600 }}>PM2.5 Fine Particles</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0d1710' }}>
                    {latestObs?.pm25 !== null && latestObs?.pm25 !== undefined ? `${latestObs.pm25.toFixed(1)} µg/m³` : 'Unavailable'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(40, 122, 69, 0.14)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: '#526b59', textTransform: 'uppercase', fontWeight: 600 }}>PM10 Coarse Dust</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0d1710' }}>
                    {latestObs?.pm10 !== null && latestObs?.pm10 !== undefined ? `${latestObs.pm10.toFixed(1)} µg/m³` : 'Not monitored'}
                  </div>
                </div>
              </div>
            </div>

            {/* Plain language explanation */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                background: 'rgba(240, 248, 242, 0.85)',
                borderLeft: `4px solid ${airQualityEval.particulateColor || '#166534'}`,
                color: '#172a1e',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '1rem',
              }}
            >
              <strong>Resident Briefing:</strong>{' '}
              {airQualityEval.particulateExplanation ||
                'Current pollutant data is unavailable for this station. Please select another station or refresh shortly.'}
            </div>
          </div>

          {/* Footer Metadata: Authority & Timestamp */}
          <div
            style={{
              paddingTop: '0.9rem',
              borderTop: '1px solid rgba(40, 122, 69, 0.14)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#526b59',
            }}
          >
            <span>Verified by {selectedStation?.monitoring_authority || 'IITM SAFAR / CPCB'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
              <Clock size={12} />
              <span>{formatTimestamp(latestObs?.datetime_local_ist || latestObs?.datetime_utc)}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: QUICK RECOMMENDATIONS */}
        <div
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(22, 38, 25, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={20} color="#166534" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                  Quick Practical Recommendations
                </h2>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#526b59', fontWeight: 600 }}>Data-calibrated</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '16px',
                    background: 'rgba(245, 248, 245, 0.95)',
                    border: '1px solid rgba(40, 122, 69, 0.14)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: `${rec.color}18`,
                      border: `1px solid ${rec.color}50`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: rec.color,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {rec.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0d1710' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: '3px', lineHeight: 1.45 }}>
                      {rec.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              paddingTop: '0.9rem',
              borderTop: '1px solid rgba(40, 122, 69, 0.14)',
              fontSize: '0.75rem',
              color: '#526b59',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Info size={13} color="#166534" />
            <span>Practical resident suggestions based on current measured particulate levels and CPCB guidance.</span>
          </div>
        </div>
      </div>

      {/* SECTION B: TODAY'S FORECAST */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 30px rgba(22, 38, 25, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#166534" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                Today&apos;s Next-Hour Forecast
              </h2>
            </div>
            <Link
              to="/forecast-guidance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                color: '#166534',
                background: 'rgba(40, 122, 69, 0.08)',
                border: '1px solid rgba(40, 122, 69, 0.22)',
                padding: '3px 10px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              title="Open dedicated Forecast & Activity Guidance page"
            >
              <span>Full 24h &amp; Activity Planner</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 248, 245, 0.95)',
                border: `1px solid ${trend.badgeColor}40`,
                fontSize: '0.78rem',
                color: trend.badgeColor,
                fontWeight: 600,
              }}
            >
              {trend.icon}
              <span>{trend.label}</span>
            </div>
          )}
        </div>

        {/* Trend summary note */}
        {trend && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(240, 248, 242, 0.85)',
              border: '1px solid rgba(40, 122, 69, 0.14)',
              fontSize: '0.82rem',
              color: '#172a1e',
              marginBottom: '1.25rem',
            }}
          >
            {trend.text}
          </div>
        )}

        {/* Compact Forecast Cards or Unavailable Message */}
        {forecastUnavailable || !forecastTrajectory?.trajectory || forecastTrajectory.trajectory.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'rgba(245, 248, 245, 0.95)',
              border: '1px solid rgba(40, 122, 69, 0.14)',
              textAlign: 'center',
              color: '#526b59',
              fontSize: '0.86rem',
            }}
          >
            Next-hour machine learning forecast inputs are currently updating for this station. Check back in a few minutes.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
            }}
          >
            {forecastTrajectory.trajectory.slice(0, 6).map((step, idx) => {
              const stepTime = new Date(step.target_time_utc);
              const timeLabel = stepTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              const stepSubIndex = calcPM25SubIndex(step.predicted_pm25);
              const stepCat = stepSubIndex !== null ? getNAQICategoryInfo(stepSubIndex) : null;

              return (
                <div
                  key={idx}
                  style={{
                    padding: '1rem 0.85rem',
                    borderRadius: '16px',
                    background: 'rgba(245, 248, 245, 0.95)',
                    border: '1px solid rgba(40, 122, 69, 0.14)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#526b59', fontWeight: 600 }}>{timeLabel}</div>
                  <div
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 800,
                      margin: '6px 0',
                      color: stepCat?.color || '#166534',
                    }}
                  >
                    {step.predicted_pm25.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#526b59', marginBottom: '6px' }}>µg/m³ PM2.5</div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: `${stepCat?.color || '#166534'}20`,
                      color: stepCat?.color || '#166534',
                      border: `1px solid ${stepCat?.color || '#166534'}50`,
                    }}
                  >
                    {step.aqi_category || stepCat?.category || 'Expected'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION D: LOCAL AIR QUALITY PREVIEW (COMPACT PUNE MAP) */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          boxShadow: '0 10px 30px rgba(22, 38, 25, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#166534" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
                Pune Pollution Map Preview
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475e4e', marginTop: '2px' }}>
              Continuous spatial monitoring grid covering PMC &amp; PCMC metropolitan areas
            </div>
          </div>

          <Link
            to="/digital-twin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              background: '#166534',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid #14532d',
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Open Full Digital Twin Map</span>
            <ExternalLink size={13} />
          </Link>
        </div>

        {/* Embedded Compact Map Preview */}
        <div
          style={{
            height: '340px',
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid rgba(40, 122, 69, 0.18)',
            position: 'relative',
          }}
        >
          {stations.length > 0 ? (
            <PuneTwinMap
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => setSelectedStationId(id)}
              latestObservations={allStationsObs}
              showTrafficBuffer={false}
              showActivityBuffer={false}
              showHeatmap={false}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#526b59',
                fontSize: '0.88rem',
              }}
            >
              Loading monitoring stations...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenPortal;
