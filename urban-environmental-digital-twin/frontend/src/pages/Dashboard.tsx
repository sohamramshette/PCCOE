import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  TrendingUp,
  Wind,
  Droplets,
  Thermometer,
  Cpu,
  ArrowRight,
  RefreshCw,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { getStations } from '../api/stations';
import { getObservations } from '../api/observations';
import { getWeather } from '../api/weather';
import { getForecast } from '../api/forecast';
import { getActiveAlerts } from '../api/alerts';
import { getPredictions } from '../api/predictions';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { WeatherItem } from '../types/weather';
import { ForecastResponse } from '../types/forecast';
import { Alert } from '../types/alert';
import { PredictionItem } from '../types/prediction';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AqiPill } from '../components/common/AqiPill';
import { AlertSeverityBadge } from '../components/alerts/AlertSeverityBadge';
import { Pm25TimeSeriesChart, ChartDataPoint } from '../components/charts/Pm25TimeSeriesChart';
import { formatNumber, formatDateTime, parseUtcDate, isWithinCanonicalPeriod } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [weatherItems, setWeatherItems] = useState<WeatherItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: stations and active alerts
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stationList, alertsList] = await Promise.all([
        getStations(true),
        getActiveAlerts().catch((err) => {
          console.error('Failed to load active alerts:', err);
          return [] as Alert[];
        }),
      ]);
      setStations(stationList);
      setActiveAlerts(alertsList);
      if (stationList.length > 0 && selectedStationId === null) {
        setSelectedStationId(stationList[0].station_id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selected station changes, fetch recent observations, weather, and forecast
  useEffect(() => {
    if (!selectedStationId) return;

    let isCurrent = true;
    const loadStationData = async () => {
      try {
        setLoadingDetails(true);
        // Fetch the last 48 hourly observations, weather, and predictions for the station
        const [obsRes, weatherRes, predRes] = await Promise.all([
          getObservations(selectedStationId, { limit: 48, offset: 0, order: 'desc', valid_pm25_only: true }),
          getWeather(selectedStationId, { limit: 24, offset: 0, order: 'desc' }),
          getPredictions(selectedStationId, { limit: 200, offset: 0, order: 'desc', model_id: 'gradient_boosting_baseline' }).catch(() => ({
            station_id: selectedStationId,
            items: [] as PredictionItem[],
            total: 0,
            page: 1,
            limit: 200,
            offset: 0,
          })),
        ]);

        if (!isCurrent) return;
        setObservations(obsRes.items || []);
        setWeatherItems(weatherRes.items || []);
        setPredictions(predRes.items || []);

        // Attempt to fetch current forecast
        try {
          const fc = await getForecast(selectedStationId);
          if (isCurrent) setForecast(fc);
        } catch {
          if (isCurrent) setForecast(null);
        }
      } catch (err: unknown) {
        if (isCurrent) {
          console.error('Error fetching station details:', err);
        }
      } finally {
        if (isCurrent) setLoadingDetails(false);
      }
    };

    loadStationData();
    return () => {
      isCurrent = false;
    };
  }, [selectedStationId]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.station_id === selectedStationId),
    [stations, selectedStationId]
  );

  // Filter observations to canonical analytical period and sort chronologically ascending (datetime_utc ASC)
  const canonicalObservations = useMemo(() => {
    return observations
      .filter((obs) => isWithinCanonicalPeriod(obs.datetime_utc))
      .sort((a, b) => parseUtcDate(a.datetime_utc).getTime() - parseUtcDate(b.datetime_utc).getTime());
  }, [observations]);

  const sortedWeatherItems = useMemo(() => {
    return [...weatherItems]
      .filter((w) => isWithinCanonicalPeriod(w.datetime_utc))
      .sort((a, b) => parseUtcDate(a.datetime_utc).getTime() - parseUtcDate(b.datetime_utc).getTime());
  }, [weatherItems]);

  // Latest observation and weather in chronological window
  const latestObservation = canonicalObservations.length > 0 ? canonicalObservations[canonicalObservations.length - 1] : null;
  const latestWeather = sortedWeatherItems.length > 0 ? sortedWeatherItems[sortedWeatherItems.length - 1] : null;

  // Chart data points in strict chronological order (oldest -> newest, datetime_utc ASC) with both observed and predicted
  const chartData: ChartDataPoint[] = useMemo(() => {
    const predMap = new Map<string, number>();
    predictions.forEach((p) => {
      predMap.set(p.target_time_utc, p.predicted_pm25);
    });

    return canonicalObservations.map((obs) => {
      const d = parseUtcDate(obs.datetime_utc);
      const label = isNaN(d.getTime())
        ? obs.datetime_utc
        : `${d.getUTCDate()} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCHours().toString().padStart(2, '0')}:00`;
      return {
        timestamp: obs.datetime_utc,
        label,
        observed: obs.pm25,
        predicted: predMap.get(obs.datetime_utc) ?? null,
      };
    });
  }, [canonicalObservations, predictions]);

  if (loading) {
    return <LoadingSpinner message="Initializing Pune Digital Twin Dashboard..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadInitialData} />;
  }

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner / Summary */}
      <div
        className="card dashboard-summary-card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          className="dashboard-summary-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="dashboard-summary-copy" style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="dashboard-summary-badges" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-observed">Continuous Monitoring</span>
              <span className="badge badge-reanalysis">ECMWF ERA5-Land Reanalysis</span>
            </div>
            <h2 style={{ position: 'relative', display: 'block', fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
              Pune Urban Environmental Digital Twin
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#475569', margin: 0, lineHeight: 1.5, maxWidth: '720px', fontWeight: 450 }}>
              Multi-source environmental intelligence fusing physical CAAQMS telemetry with atmospheric reanalysis
              and machine learning forecasting for the Pune & PCMC metropolitan corridor.
            </p>
          </div>

          <div className="dashboard-summary-controls" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <div className="form-group dashboard-station-select-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Focus Station</label>
              <select
                className="form-select dashboard-station-select"
                value={selectedStationId || ''}
                onChange={(e) => setSelectedStationId(Number(e.target.value))}
                style={{ minWidth: '260px' }}
              >
                {stations.map((st) => (
                  <option key={st.station_id} value={st.station_id}>
                    {st.station_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (selectedStationId) setSelectedStationId(selectedStationId);
              }}
              className="btn btn-secondary dashboard-refresh-button"
              title="Refresh Station Data"
              aria-label="Refresh Station Data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Network High-Level Metric Tiles */}
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">
            <span>Active Network Stations</span>
            <MapPin size={16} color="var(--primary)" />
          </div>
          <div className="stat-value">{stations.length}</div>
          <div className="stat-subtext">Pune & PCMC Continuous CAAQMS</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">
            <span>Latest Observed PM2.5</span>
            <ProvenanceBadge classification="OBSERVED" />
          </div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {latestObservation && latestObservation.pm25 !== null && latestObservation.pm25 !== undefined ? (
              <AqiPill pm25={latestObservation.pm25} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>NO DATA</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  Missing Sensor Reading
                </span>
              </div>
            )}
          </div>
          <div className="stat-subtext">
            {latestObservation ? `Recorded at ${formatDateTime(latestObservation.datetime_utc)}` : 'Station offline'}
          </div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">
            <span>Next-Hour Forecast</span>
            <ProvenanceBadge classification="PREDICTED" />
          </div>
          <div className="stat-value">
            {forecast ? (
              <span>
                {formatNumber(forecast.predicted_pm25, 1)}
                <span className="stat-unit">µg/m³</span>
              </span>
            ) : (
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Inputs Unavailable</span>
            )}
          </div>
          <div className="stat-subtext">
            {forecast ? `Target: ${formatDateTime(forecast.target_time_utc)}` : 'Historical baseline input pending'}
          </div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">
            <span>Default Forecast Model</span>
            <Cpu size={16} color="var(--accent)" />
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', paddingTop: '0.2rem' }}>
            Gradient Boosting
          </div>
          <div className="stat-subtext">
            Test MAE: <strong>4.10 µg/m³</strong> (HistGradientBoosting)
          </div>
        </div>
      </div>

      {/* Active Environmental Alerts Card */}
      <div
        className="card"
        style={{
          borderLeft: activeAlerts.length > 0 ? '4px solid #ef4444' : '4px solid #10b981',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '4px',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}
        >
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <AlertTriangle size={18} color={activeAlerts.length > 0 ? '#ef4444' : '#10b981'} />
              <span>Active Environmental Alerts</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: activeAlerts.length > 0 ? '#fee2e2' : '#ecfdf5',
                  color: activeAlerts.length > 0 ? '#dc2626' : '#059669',
                }}
              >
                {activeAlerts.length}
              </span>
            </div>
            <div className="card-subtitle" style={{ color: '#64748b' }}>
              Continuous CAAQMS anomaly detection & dispersion limit monitoring
            </div>
          </div>
          <Link
            to="/alerts"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#0f172a',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              transition: 'background 0.2s ease',
            }}
          >
            <span>View All Alerts →</span>
          </Link>
        </div>

        {activeAlerts.length === 0 ? (
          <div
            style={{
              padding: '0.75rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✓ All CAAQMS stations report nominal parameters within regulatory thresholds and dispersion bounds.</span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              marginTop: '0.75rem',
            }}
          >
            {activeAlerts.slice(0, 4).map((alert) => {
              const isCritical = alert.severity?.toUpperCase() === 'CRITICAL';
              return (
                <div
                  key={alert.alert_id}
                  style={{
                    padding: '1.1rem 1.25rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: `1.5px solid ${isCritical ? '#fecaca' : '#fef3c7'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    boxShadow: isCritical
                      ? '0 4px 16px rgba(239, 68, 68, 0.06)'
                      : '0 4px 16px rgba(245, 158, 11, 0.06)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AlertSeverityBadge severity={alert.severity} />
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                      {formatDateTime(alert.detected_at)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#0f172a', marginTop: '0.2rem', lineHeight: 1.3 }}>
                    {alert.station_name || `Station #${alert.station_id}`}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isCritical ? '#dc2626' : '#d97706', letterSpacing: '0.02em' }}>
                    {alert.alert_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
                    {alert.observed_value !== null && alert.expected_value !== null ? (
                      <span>
                        <strong style={{ color: '#0f172a' }}>{formatNumber(alert.observed_value, 1)}</strong>
                        {alert.pollutant ? ' µg/m³' : ''} vs expected{' '}
                        <strong style={{ color: '#0f172a' }}>{formatNumber(alert.expected_value, 1)}</strong>
                        {alert.pollutant ? ' µg/m³' : ''}
                      </span>
                    ) : alert.deviation != null ? (
                      <span>
                        Deviation:{' '}
                        <strong style={{ color: '#0f172a' }}>
                          {alert.deviation > 0 ? '+' : ''}
                          {formatNumber(alert.deviation, 1)}
                        </strong>
                        {alert.pollutant ? ' µg/m³' : ''}
                      </span>
                    ) : (
                      <span>{alert.message}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Time Series & Weather Context */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '1.5rem' }}>
        {/* PM2.5 Recent Trend Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--primary)" />
                <span>Recent PM2.5 Ambient Trend</span>
              </div>
              <div className="card-subtitle">
                {selectedStation?.station_name} — Chronological PM2.5 Trend (Ascending UTC)
              </div>
            </div>
            <ProvenanceBadge classification="OBSERVED" />
          </div>

          {loadingDetails ? (
            <LoadingSpinner message="Loading historical readings..." />
          ) : (
            <Pm25TimeSeriesChart data={chartData} height={280} />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Info size={14} /> Gaps indicate physical sensor downtime (preserved strictly without interpolation).
            </span>
            {selectedStationId && (
              <Link to={`/stations/${selectedStationId}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem' }}>
                <span>Station Details</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>

        {/* Contemporary Reanalysis Weather Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Wind size={18} color="var(--accent)" />
                <span>Atmospheric Reanalysis State</span>
              </div>
              <div className="card-subtitle">
                ECMWF ERA5-Land Surface Meteorology Assimilation
              </div>
            </div>
            <ProvenanceBadge classification="REANALYSIS" />
          </div>

          {loadingDetails ? (
            <LoadingSpinner message="Loading atmospheric parameters..." />
          ) : latestWeather ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="weather-metric-grid">
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Thermometer size={15} color="#2563eb" /> Temperature
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem', color: '#0f172a' }}>
                    {formatNumber(latestWeather.temp_c, 1)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>°C</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Droplets size={15} color="#ea580c" /> Humidity
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem', color: '#0f172a' }}>
                    {formatNumber(latestWeather.humidity_pct, 1)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>%</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Wind size={15} color="#16a34a" /> Wind Speed
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem', color: '#0f172a' }}>
                    {formatNumber(latestWeather.wind_speed_ms, 2)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>m/s</span>
                  </div>
                </div>
              </div>

              <div className="weather-context-grid">
                <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Surface Pressure:</span>{' '}
                  <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{formatNumber(latestWeather.pressure_hpa, 1)} hPa</strong>
                </div>
                <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Boundary Layer (PBLH):</span>{' '}
                  <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{formatNumber(latestWeather.pbl_height_m, 0)} m</strong>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#1e40af',
                  backgroundColor: '#eff6ff',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe',
                  lineHeight: 1.5,
                }}
              >
                Reanalysis represents continuous numerical atmospheric assimilation, capturing regional boundary
                layer physics across the Pune basin.
              </div>
            </div>
          ) : (
            <div className="state-container">No weather data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
