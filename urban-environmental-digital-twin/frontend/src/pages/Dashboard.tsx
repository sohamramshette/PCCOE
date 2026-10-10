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
import { getModels } from '../api/models';
import { getActiveAlerts } from '../api/alerts';
import { getPredictions } from '../api/predictions';
import { Station } from '../types/station';
import { ObservationItem } from '../types/observation';
import { WeatherItem } from '../types/weather';
import { ForecastResponse } from '../types/forecast';
import { ModelSummary } from '../types/model';
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
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: stations, models, and active alerts
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stationList, modelList, alertsList] = await Promise.all([
        getStations(true),
        getModels(),
        getActiveAlerts().catch((err) => {
          console.error('Failed to load active alerts:', err);
          return [] as Alert[];
        }),
      ]);
      setStations(stationList);
      setModels(modelList);
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
          background: 'linear-gradient(135deg, rgba(34, 48, 33, 0.75) 0%, rgba(19, 27, 18, 0.85) 100%)',
          border: '1px solid var(--border-subtle, rgba(163, 181, 147, 0.18))',
          borderRadius: '16px',
          padding: '1.75rem',
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
            <h2 style={{ position: 'relative', display: 'block', fontSize: '1.65rem', fontWeight: 600, color: 'var(--text-primary, #eef1e7)', margin: 0, lineHeight: 1.25 }}>
              Pune Urban Environmental Digital Twin
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, rgba(238, 241, 231, 0.74))', margin: 0, lineHeight: 1.5, maxWidth: '720px' }}>
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
          borderLeft: activeAlerts.length > 0 ? '4px solid #cf6651' : '4px solid #8fa07e',
          background:
            activeAlerts.length > 0
              ? 'linear-gradient(135deg, rgba(207, 102, 81, 0.1) 0%, rgba(22, 30, 21, 0.88) 100%)'
              : 'rgba(22, 30, 21, 0.85)',
          border: '1px solid var(--border-subtle, rgba(163, 181, 147, 0.16))',
          borderRadius: '16px',
        }}
      >
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}
        >
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color={activeAlerts.length > 0 ? '#cf6651' : '#8fa07e'} />
              <span>Active Environmental Alerts</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: activeAlerts.length > 0 ? 'rgba(207, 102, 81, 0.18)' : 'rgba(143, 160, 126, 0.18)',
                  color: activeAlerts.length > 0 ? '#f87171' : '#a3b593',
                }}
              >
                {activeAlerts.length}
              </span>
            </div>
            <div className="card-subtitle">
              Continuous CAAQMS anomaly detection & dispersion limit monitoring
            </div>
          </div>
          <Link
            to="/alerts"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--primary-light, #a3b593)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(143, 160, 126, 0.14)',
              border: '1px solid rgba(143, 160, 126, 0.25)',
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
            {activeAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.alert_id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(26, 36, 25, 0.9)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle, rgba(163, 181, 147, 0.16))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AlertSeverityBadge severity={alert.severity} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatDateTime(alert.detected_at)}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #eef1e7)', marginTop: '0.2rem' }}>
                  {alert.station_name || `Station #${alert.station_id}`}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-light, #a3b593)' }}>
                  {alert.alert_type.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, rgba(238, 241, 231, 0.74))' }}>
                  {alert.observed_value !== null && alert.expected_value !== null ? (
                    <span>
                      <strong>{formatNumber(alert.observed_value, 1)}</strong>
                      {alert.pollutant ? ' µg/m³' : ''} vs expected{' '}
                      <strong>{formatNumber(alert.expected_value, 1)}</strong>
                      {alert.pollutant ? ' µg/m³' : ''}
                    </span>
                  ) : alert.deviation != null ? (
                    <span>
                      Deviation:{' '}
                      <strong>
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
            ))}
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
                <div style={{ background: 'rgba(26, 36, 25, 0.85)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Thermometer size={14} color="#60a5fa" /> Temperature
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    {formatNumber(latestWeather.temp_c, 1)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>°C</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(26, 36, 25, 0.85)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Droplets size={14} color="#fb923c" /> Humidity
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    {formatNumber(latestWeather.humidity_pct, 1)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>%</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(26, 36, 25, 0.85)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Wind size={14} color="#4ade80" /> Wind Speed
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    {formatNumber(latestWeather.wind_speed_ms, 2)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>m/s</span>
                  </div>
                </div>
              </div>

              <div className="weather-context-grid">
                <div style={{ padding: '0.55rem 0.85rem', background: 'rgba(19, 27, 18, 0.75)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Surface Pressure:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{formatNumber(latestWeather.pressure_hpa, 1)} hPa</strong>
                </div>
                <div style={{ padding: '0.55rem 0.85rem', background: 'rgba(19, 27, 18, 0.75)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Boundary Layer (PBLH):</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{formatNumber(latestWeather.pbl_height_m, 0)} m</strong>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(96, 165, 250, 0.05)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(96, 165, 250, 0.15)',
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

      {/* Baseline Models Overview Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Cpu size={18} color="var(--primary)" />
              <span>Registered Machine Learning Baseline Models</span>
            </div>
            <div className="card-subtitle">
              Trained on 84,096 station-hours with strict chronological validation & test holdout
            </div>
          </div>
          <span className="badge badge-predicted">Phase 7 Benchmarks</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model Identifier</th>
                <th>Algorithm Family</th>
                <th>Target Horizon</th>
                <th>Validation MAE</th>
                <th>Test MAE</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.model_id}>
                  <td>
                    <strong>{m.model_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.model_id}</div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', color: '#1d4ed8' }}>{m.model_type}</code>
                  </td>
                  <td>{m.horizon} ({m.target})</td>
                  <td>{formatNumber(m.validation_mae, 4)} µg/m³</td>
                  <td>
                    <strong style={{ color: m.test_mae < 4.1 ? '#10b981' : 'inherit' }}>
                      {formatNumber(m.test_mae, 4)} µg/m³
                    </strong>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: m.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                        color: m.is_active ? '#047857' : '#64748b',
                        fontWeight: 600,
                      }}
                    >
                      {m.is_active ? 'ACTIVE' : 'STANDBY'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
