import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Compass,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { getStations } from '../api/stations';
import { getForecast, getForecastTrajectory } from '../api/forecast';
import { getModels } from '../api/models';
import { Station } from '../types/station';
import { ForecastResponse, ForecastTrajectoryResponse } from '../types/forecast';
import { ModelSummary } from '../types/model';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AqiPill } from '../components/common/AqiPill';
import { AiForecastAdvisory } from '../components/forecast/AiForecastAdvisory';
import { ForecastTrajectoryChart } from '../components/forecast/ForecastTrajectoryChart';
import { formatNumber, formatDateTime, formatDateTimeIST } from '../utils/formatters';

export const Forecast: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gradient_boosting_baseline');

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [trajectory, setTrajectory] = useState<ForecastTrajectoryResponse | null>(null);
  const [horizonHours, setHorizonHours] = useState<number>(24);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingForecast, setFetchingForecast] = useState<boolean>(false);
  const [fetchingTrajectory, setFetchingTrajectory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load stations & models
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [stationList, modelList] = await Promise.all([
          getStations(true),
          getModels(),
        ]);
        setStations(stationList);
        setModels(modelList);
        if (stationList.length > 0) {
          setSelectedStationId(stationList[0].station_id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch forecast and trajectory whenever station or model changes
  const fetchActiveForecast = async (stationId: number, modelId: string, horizon: number = 24) => {
    try {
      setFetchingForecast(true);
      setError(null);
      const [res, trajRes] = await Promise.all([
        getForecast(stationId, { model_id: modelId }),
        getForecastTrajectory(stationId, { model_id: modelId, horizon_hours: horizon }).catch((err) => {
          console.warn('Trajectory fetch unavailable:', err);
          return null;
        }),
      ]);
      setForecast(res);
      setTrajectory(trajRes);
    } catch (err: unknown) {
      setForecast(null);
      setTrajectory(null);
      setError(err instanceof Error ? err.message : 'Unable to generate forecast for selected station.');
    } finally {
      setFetchingForecast(false);
    }
  };

  const handleHorizonChange = async (hours: number) => {
    setHorizonHours(hours);
    if (selectedStationId) {
      try {
        setFetchingTrajectory(true);
        const traj = await getForecastTrajectory(selectedStationId, {
          model_id: selectedModelId,
          horizon_hours: hours,
        });
        setTrajectory(traj);
      } catch (err) {
        console.error('Failed to change horizon', err);
      } finally {
        setFetchingTrajectory(false);
      }
    }
  };


  useEffect(() => {
    if (selectedStationId) {
      fetchActiveForecast(selectedStationId, selectedModelId);
    }
  }, [selectedStationId, selectedModelId]);

  if (loading) {
    return <LoadingSpinner message="Loading forecast inference engine..." />;
  }

  const selectedStation = stations.find((s) => s.station_id === selectedStationId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Next-Hour PM2.5 Forecast (t + 1)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Model inference using verified multi-domain inputs from the canonical analytical period (up to 2026-09-24). The target represents
            ambient PM2.5 concentration at lead time +1 hour.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
            <label className="form-label">Target Monitoring Station</label>
            <select
              className="form-select"
              value={selectedStationId || ''}
              onChange={(e) => setSelectedStationId(Number(e.target.value))}
            >
              {stations.map((st) => (
                <option key={st.station_id} value={st.station_id}>
                  {st.station_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
            <label className="form-label">Inference Model</label>
            <select
              className="form-select"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.model_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (selectedStationId) fetchActiveForecast(selectedStationId, selectedModelId);
            }}
            className="btn btn-secondary"
            style={{ marginTop: '1.3rem', padding: '0.65rem' }}
            title="Refresh Forecast"
            disabled={fetchingForecast}
          >
            <RefreshCw size={16} className={fetchingForecast ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={() => selectedStationId && fetchActiveForecast(selectedStationId, selectedModelId)} />}

      {/* Main Forecast Hero Display */}
      {fetchingForecast ? (
        <LoadingSpinner message="Executing ML pipeline inference on backend..." />
      ) : forecast ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92))',
              borderColor: 'var(--border-blue)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ProvenanceBadge classification="PREDICTED" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Station: {forecast.station_name} {selectedStation ? `(${selectedStation.zone_type})` : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Forecasted Ambient PM2.5 (1-Hour Ahead)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatNumber(forecast.predicted_pm25, 2)}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>µg/m³</span>
                  <div style={{ marginLeft: '1rem' }}>
                    <AqiPill pm25={forecast.predicted_pm25} />
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(248, 250, 252, 0.9)',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  minWidth: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <Clock size={15} color="var(--primary)" />
                  <span>Initialization Hour (t):</span>
                </div>
                <strong>{formatDateTime(forecast.prediction_time_utc)}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTimeIST(forecast.prediction_time_utc)}</div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                    <TrendingUp size={15} color="var(--primary)" />
                    <span>Target Horizon (t + 1):</span>
                  </div>
                  <strong>{formatDateTime(forecast.target_time_utc)}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTimeIST(forecast.target_time_utc)}</div>
                </div>
              </div>
            </div>

            {/* Input Verification Banner */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                />
                <span>Input Verification Status: <strong>{forecast.data_availability_status}</strong></span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Active Serving Model: <code>{forecast.model_id}</code> ({forecast.model_type})
              </div>
            </div>
          </div>

          {/* 24-Hour Multi-Horizon Forecast Trajectory */}
          {trajectory && (
            <ForecastTrajectoryChart
              trajectoryData={trajectory}
              selectedHorizon={horizonHours}
              onHorizonChange={handleHorizonChange}
              loading={fetchingTrajectory}
            />
          )}

          {/* AI Atmospheric & Public Health Advisory (Gemini Powered) */}
          <AiForecastAdvisory stationId={forecast.station_id} modelId={selectedModelId} />

          {/* Model Features Extracted at Inference */}
          {forecast.input_features_summary && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Compass size={18} color="var(--accent)" />
                    <span>Contemporaneous Input Features Snapshot</span>
                  </div>
                  <div className="card-subtitle">
                    Physical features extracted by ForecastService at initialization hour t
                  </div>
                </div>
                <span className="badge badge-reanalysis">Feature Audit</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline PM2.5 (t)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {forecast.input_features_summary.pm25_t !== null && forecast.input_features_summary.pm25_t !== undefined
                      ? `${formatNumber(forecast.input_features_summary.pm25_t, 1)} µg/m³`
                      : 'Missing'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <ProvenanceBadge classification="OBSERVED" />
                    {(forecast.input_features_summary.pm25_t === null || forecast.input_features_summary.pm25_t === undefined) && (
                      <span style={{ color: '#b45309', fontSize: '0.7rem' }}>
                        Input fallback: model pipeline median
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Air Temperature</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {formatNumber(forecast.input_features_summary.temp_c, 1)} °C
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <ProvenanceBadge classification="REANALYSIS" />
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wind Speed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {formatNumber(forecast.input_features_summary.wind_speed_ms, 2)} m/s
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <ProvenanceBadge classification="REANALYSIS" />
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ventilation Index</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {formatNumber(forecast.input_features_summary.ventilation_index, 1)} m²/s
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Wind × PBLH Dispersion
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Traffic Intensity Index</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {formatNumber(forecast.input_features_summary.traffic_proxy_index, 3)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <ProvenanceBadge classification="TRAFFIC_PROXY" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {forecast.feature_attributions && forecast.feature_attributions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <TrendingUp size={18} color="var(--accent)" />
                    <span>Top SHAP Drivers for This Forecast</span>
                  </div>
                  <div className="card-subtitle">
                    Contribution values show which built features pushed the prediction up or down for this hour
                  </div>
                </div>
                <span className="badge badge-reanalysis">Explainability</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
                {forecast.feature_attributions.map((item, index) => (
                  <div key={`${item.feature}-${index}`} style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.9rem 1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.feature}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.55rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: item.direction === 'positive' ? '#b91c1c' : '#0f766e' }}>
                        {item.direction === 'positive' ? '+' : '-'}{formatNumber(Math.abs(item.contribution), 3)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.direction === 'positive' ? 'pushes up' : 'pushes down'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Forecast Currently Unavailable</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
            No complete historical observation and weather record is available for this station at the latest timestamp.
            In accordance with digital twin principles, missing inputs are rejected rather than fabricated.
          </p>
        </div>
      )}

      {/* Epistemological & Scientific Integrity Notice */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          backgroundColor: 'rgba(248, 250, 252, 0.72)',
        }}
      >
        <Info size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong>Distinction Between Observations and Forecasts:</strong> The value displayed above is a statistical
          forecast produced by <code>{selectedModelId}</code> using historical sensor lags and atmospheric reanalysis.
          It is explicitly classified as <ProvenanceBadge classification="PREDICTED" /> and must not be cited as an observed physical sensor measurement.
          Observed PM2.5 strictly preserves missing sensor readings without synthetic interpolation; if input features are missing at prediction time, the ML serving pipeline applies preprocessor median fallback for inference only.
        </div>
      </div>
    </div>
  );
};
