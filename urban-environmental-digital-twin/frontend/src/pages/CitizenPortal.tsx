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
              <Heart size={13} />
              My Air Dashboard
            </span>
            <span style={{ fontSize: '11px', color: '#9eab93' }}>Pune &amp; Pimpri-Chinchwad Metropolitan Area</span>
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
            How is the air in your neighborhood today?
          </h1>

          <p style={{ margin: 0, fontSize: '0.92rem', color: '#c9d3bf', maxWidth: '720px', lineHeight: 1.5 }}>
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
              background: 'rgba(143, 160, 126, 0.12)',
              border: '1px solid rgba(163, 181, 147, 0.28)',
              color: '#a3b593',
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
              background: 'rgba(143, 160, 126, 0.12)',
              border: '1px solid rgba(163, 181, 147, 0.28)',
              color: '#a3b593',
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
        style={{
          marginBottom: '1.75rem',
          background: 'rgba(23, 33, 21, 0.72)',
          border: '1px solid rgba(163, 181, 147, 0.2)',
          borderRadius: '18px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        <button
          type="button"
          onClick={() => setVoiceAssistantOpen(!voiceAssistantOpen)}
          style={{
            width: '100%',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            color: '#eef1e7',
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
                background: 'rgba(143, 160, 126, 0.2)',
                color: '#a3b593',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f4f6f0' }}>
                AirLens Voice Assistant
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9eab93' }}>
                Ask spoken or typed questions about workouts, sensitive health advisories, or clean travel
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#a3b593', fontWeight: 600 }}>
            <span>{voiceAssistantOpen ? 'Hide Assistant' : 'Ask Question'}</span>
            {voiceAssistantOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {voiceAssistantOpen && (
          <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(163, 181, 147, 0.12)' }}>
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
          <MapPin size={16} color="#8fa07e" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#eef1e7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                  border: isSelected ? '1.5px solid #8fa07e' : '1px solid rgba(163, 181, 147, 0.2)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(38, 56, 35, 0.95) 0%, rgba(24, 38, 23, 0.95) 100%)'
                    : 'rgba(20, 28, 19, 0.65)',
                  color: isSelected ? '#ffffff' : '#c9d3bf',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 14px rgba(0, 0, 0, 0.3)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#8fa07e' : '#a3b593',
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
          style={{
            marginBottom: '1.75rem',
            padding: '1.25rem 1.75rem',
            borderRadius: '20px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Local Environmental Alert ({activeAlerts.length})
              </span>
            </div>
            <Link
              to="/alerts"
              style={{
                fontSize: '0.78rem',
                color: '#fbbf24',
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
                  background: 'rgba(20, 28, 19, 0.65)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                    {alt.message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(238, 241, 231, 0.6)', marginTop: '2px' }}>
                    Type: {alt.alert_type.replace(/_/g, ' ')} · Severity: {alt.severity}
                  </div>
                </div>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: alt.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                    color: alt.severity === 'HIGH' ? '#fca5a5' : '#fde68a',
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
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
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
                      background: latestObs?.data_provenance === 'OBSERVED' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(143, 160, 126, 0.18)',
                      color: latestObs?.data_provenance === 'OBSERVED' ? '#4ade80' : '#a3b593',
                      border: '1px solid rgba(163, 181, 147, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: latestObs?.data_provenance === 'OBSERVED' ? '#4ade80' : '#a3b593' }} />
                    {latestObs?.data_provenance === 'OBSERVED' ? 'Measured reading' : 'Model estimate'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9eab93' }}>
                    {latestObs?.data_provenance === 'OBSERVED'
                      ? 'Direct sensor reading from this station'
                      : 'Statistical estimate from neighboring station network'}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '2px 0 0', color: '#f4f6f0' }}>
                  {selectedStation ? selectedStation.station_name : 'Monitoring Station'}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#9eab93' }}>
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
                    backgroundColor: `${airQualityEval.particulateColor || '#a3b593'}25`,
                    color: '#ffffff',
                    border: `1.5px solid ${airQualityEval.particulateColor || '#a3b593'}`,
                    boxShadow: `0 0 16px ${airQualityEval.particulateColor || '#a3b593'}30`,
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
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#9eab93',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
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
                background: airQualityEval.isOfficialAqiAvailable ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.04)',
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
                      fontSize: '3.6rem',
                      fontWeight: 800,
                      color: airQualityEval.particulateColor || '#a3b593',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {airQualityEval.particulateIndex ?? '--'}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#9eab93', fontWeight: 600 }}>/ 500</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9eab93', marginTop: '4px' }}>
                  Calculated from available {airQualityEval.prominentParticulate || 'PM2.5'} using CPCB sub-index scale
                </div>
              </div>

              {/* Sub-pollutants (PM2.5 and PM10) distinct from AQI */}
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
                    {latestObs?.pm25 !== null && latestObs?.pm25 !== undefined ? `${latestObs.pm25.toFixed(1)} µg/m³` : 'Unavailable'}
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
                background: 'rgba(143, 160, 126, 0.1)',
                borderLeft: `4px solid ${airQualityEval.particulateColor || '#a3b593'}`,
                color: '#eef1e7',
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
              borderTop: '1px solid rgba(163, 181, 147, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#9eab93',
            }}
          >
            <span>Verified by {selectedStation?.monitoring_authority || 'IITM SAFAR / CPCB'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a3b593', fontWeight: 600 }}>
              <Clock size={12} />
              <span>{formatTimestamp(latestObs?.datetime_local_ist || latestObs?.datetime_utc)}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: QUICK RECOMMENDATIONS */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
            border: '1px solid rgba(163, 181, 147, 0.22)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={20} color="#8fa07e" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                  Quick Practical Recommendations
                </h2>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#9eab93' }}>Data-calibrated</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '16px',
                    background: 'rgba(14, 22, 14, 0.65)',
                    border: '1px solid rgba(163, 181, 147, 0.14)',
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
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f4f6f0' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#c9d3bf', marginTop: '3px', lineHeight: 1.45 }}>
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
              borderTop: '1px solid rgba(163, 181, 147, 0.15)',
              fontSize: '0.75rem',
              color: 'rgba(238, 241, 231, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Info size={13} />
            <span>Practical resident suggestions based on current measured particulate levels and CPCB guidance.</span>
          </div>
        </div>
      </div>

      {/* SECTION B: TODAY'S FORECAST */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#8fa07e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
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
                color: '#a3b593',
                background: 'rgba(143, 160, 126, 0.12)',
                border: '1px solid rgba(163, 181, 147, 0.25)',
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
                background: 'rgba(14, 20, 14, 0.65)',
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
              background: 'rgba(14, 20, 14, 0.5)',
              border: '1px solid rgba(163, 181, 147, 0.12)',
              fontSize: '0.82rem',
              color: '#c9d3bf',
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
              background: 'rgba(14, 20, 14, 0.55)',
              border: '1px solid rgba(163, 181, 147, 0.12)',
              textAlign: 'center',
              color: '#9eab93',
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
                    background: 'rgba(14, 20, 14, 0.65)',
                    border: '1px solid rgba(163, 181, 147, 0.14)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#9eab93', fontWeight: 600 }}>{timeLabel}</div>
                  <div
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 800,
                      margin: '6px 0',
                      color: stepCat?.color || '#a3b593',
                    }}
                  >
                    {step.predicted_pm25.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9eab93', marginBottom: '6px' }}>µg/m³ PM2.5</div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: `${stepCat?.color || '#a3b593'}20`,
                      color: stepCat?.color || '#a3b593',
                      border: `1px solid ${stepCat?.color || '#a3b593'}50`,
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
        style={{
          background: 'linear-gradient(145deg, rgba(26, 38, 25, 0.88) 0%, rgba(18, 26, 17, 0.95) 100%)',
          border: '1px solid rgba(163, 181, 147, 0.22)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#8fa07e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f4f6f0' }}>
                Pune Pollution Map Preview
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9eab93', marginTop: '2px' }}>
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
              background: 'linear-gradient(135deg, #7c936b 0%, #4a5c3e 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid rgba(163, 181, 147, 0.4)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
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
            border: '1px solid rgba(163, 181, 147, 0.2)',
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
                color: '#9eab93',
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
