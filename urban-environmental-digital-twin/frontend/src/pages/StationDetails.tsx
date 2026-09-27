import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  Wind,
  Layers,
  Car,
  Factory,
  Building,
  RefreshCw,
} from 'lucide-react';
import { getStation } from '../api/stations';
import { getObservations } from '../api/observations';
import { getWeather } from '../api/weather';
import { getPredictions } from '../api/predictions';
import { StationDetail } from '../types/station';
import { ObservationItem } from '../types/observation';
import { WeatherItem } from '../types/weather';
import { PredictionItem } from '../types/prediction';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AqiPill } from '../components/common/AqiPill';
import { Pm25TimeSeriesChart, ChartDataPoint } from '../components/charts/Pm25TimeSeriesChart';
import { WeatherContextChart } from '../components/charts/WeatherContextChart';
import { formatNumber, formatDateTime, parseUtcDate, isWithinCanonicalPeriod } from '../utils/formatters';

export const StationDetails: React.FC = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const numericStationId = Number(stationId);

  const [station, setStation] = useState<StationDetail | null>(null);
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [weatherItems, setWeatherItems] = useState<WeatherItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (isNaN(numericStationId)) {
      setError('Invalid station ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [stationRes, obsRes, weatherRes, predRes] = await Promise.all([
        getStation(numericStationId),
        getObservations(numericStationId, { limit: 48 }),
        getWeather(numericStationId, { limit: 24 }),
        getPredictions(numericStationId, { limit: 48 }),
      ]);

      setStation(stationRes);
      setObservations(obsRes.items || []);
      setWeatherItems(weatherRes.items || []);
      setPredictions(predRes.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load station profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [numericStationId]);

  // Filter and sort observations chronologically ascending (datetime_utc ASC)
  const canonicalObservations = useMemo(() => {
    return observations
      .filter((obs) => isWithinCanonicalPeriod(obs.datetime_utc))
      .sort((a, b) => parseUtcDate(a.datetime_utc).getTime() - parseUtcDate(b.datetime_utc).getTime());
  }, [observations]);

  // Merge observed and predicted for chart in strict chronological order (oldest -> newest, datetime_utc ASC)
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
    return <LoadingSpinner message={`Loading station profile for Station ${stationId}...`} />;
  }

  if (error || !station) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link to="/stations" className="btn btn-secondary" style={{ width: 'fit-content', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Stations
        </Link>
        <ErrorDisplay message={error || 'Station not found.'} onRetry={loadData} />
      </div>
    );
  }

  const latestObs = canonicalObservations.length > 0 ? canonicalObservations[canonicalObservations.length - 1] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation and Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/stations" className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{station.station_name}</h2>
              <span className="badge badge-observed">ID: {station.station_id}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
              <span>{station.zone_type}</span>
              <span>•</span>
              <span>{station.monitoring_authority}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Navigation size={13} color="var(--primary)" />
                {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
              </span>
            </div>
          </div>
        </div>

        <button onClick={loadData} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
          <RefreshCw size={14} /> Refresh Diagnostics
        </button>
      </div>

      {/* Primary Status Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
            Current Ambient PM2.5 Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {latestObs ? (
              <AqiPill pm25={latestObs.pm25} />
            ) : (
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Sensor Offline / No Reading</span>
            )}
            <ProvenanceBadge classification="OBSERVED" />
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>Completeness Tier: <strong>{latestObs?.pm25_completeness_flag || 'N/A'}</strong></div>
          <div>Last Reading Timestamp: <strong>{formatDateTime(latestObs?.datetime_utc)}</strong></div>
        </div>
      </div>

      {/* Historical PM2.5 Observations & Predictions Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Layers size={18} color="var(--primary)" />
              <span>Ground Truth Observations vs. Model Predictions</span>
            </div>
            <div className="card-subtitle">
              Sensor measurements (Solid) vs. Baseline Model Next-Hour Estimates (Dashed). Note: Missing sensor periods are strictly preserved.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge classification="OBSERVED" />
            <ProvenanceBadge classification="PREDICTED" />
          </div>
        </div>

        <Pm25TimeSeriesChart data={chartData} height={320} />
      </div>

      {/* Spatial Exposures (Road Network & Urban Activity) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
        {/* Road Network Exposure */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Car size={18} color="#f97316" />
                <span>Road Network Exposure Buffer</span>
              </div>
              <div className="card-subtitle">1,500m Geographic Station Buffer</div>
            </div>
            <ProvenanceBadge classification="STATIC_ROAD_NETWORK" />
          </div>

          {station.traffic_exposure ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Road Network Length:</span>
                <strong>{formatNumber(station.traffic_exposure.total_road_length_km, 2)} km</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Major Road Network Length:</span>
                <strong>{formatNumber(station.traffic_exposure.major_road_length_km, 2)} km</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Major Road Density:</span>
                <strong>{formatNumber(station.traffic_exposure.major_road_density_km_per_km2, 2)} km/km²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Distance to Nearest Major Road:</span>
                <strong>{formatNumber(station.traffic_exposure.distance_to_nearest_major_road_m, 1)} m</strong>
              </div>
            </div>
          ) : (
            <div className="state-container">Road network metrics not available.</div>
          )}
        </div>

        {/* Urban Activity & Industrial Exposure */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Factory size={18} color="#f87171" />
                <span>Urban Activity & Zoning Buffer</span>
              </div>
              <div className="card-subtitle">Industrial (2 km) & Activity (1.5 km) Buffer Metrics</div>
            </div>
            <ProvenanceBadge classification="ACTIVITY_PROXY" />
          </div>

          {station.activity_exposure ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Dominant Land Use:</span>
                <strong style={{ textTransform: 'capitalize' }}>{station.activity_exposure.dominant_landuse}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Industrial Facilities (2 km):</span>
                <strong>{station.activity_exposure.industrial_elements_2km} units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Construction Sites (1.5 km):</span>
                <strong>{station.activity_exposure.construction_elements_1_5km} sites</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>POI Footfall Density:</span>
                <strong>{formatNumber(station.activity_exposure.poi_density_per_km2, 2)} POIs/km²</strong>
              </div>
            </div>
          ) : (
            <div className="state-container">Activity metrics not available.</div>
          )}
        </div>
      </div>

      {/* Atmospheric Reanalysis Parameters */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Wind size={18} color="#2563eb" />
              <span>Co-Located Weather Reanalysis (ECMWF ERA5-Land)</span>
            </div>
            <div className="card-subtitle">
              Temperature, humidity, and atmospheric boundary dynamics for this station coordinate
            </div>
          </div>
          <ProvenanceBadge classification="REANALYSIS" />
        </div>

        <WeatherContextChart data={weatherItems} height={260} />
      </div>

      {/* Raw Recent Observations Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Building size={18} color="var(--primary)" />
            <span>Recent Hourly Observations Registry</span>
          </div>
          <ProvenanceBadge classification="OBSERVED" />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>PM2.5 (µg/m³)</th>
                <th>Completeness</th>
                <th>PM10 (µg/m³)</th>
                <th>NO2 (µg/m³)</th>
                <th>Temp (°C)</th>
                <th>Humidity (%)</th>
              </tr>
            </thead>
            <tbody>
              {canonicalObservations.slice(0, 10).map((obs) => (
                <tr key={obs.id}>
                  <td>{formatDateTime(obs.datetime_utc)}</td>
                  <td>
                    {obs.pm25 !== null && obs.pm25 !== undefined ? (
                      <strong>{formatNumber(obs.pm25, 1)}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>null</span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor:
                          obs.pm25_completeness_flag === 'FULL'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          obs.pm25_completeness_flag === 'FULL' ? '#047857' : '#b91c1c',
                      }}
                    >
                      {obs.pm25_completeness_flag}
                    </span>
                  </td>
                  <td>{formatNumber(obs.pm10, 1)}</td>
                  <td>{formatNumber(obs.no2, 1)}</td>
                  <td>{formatNumber(obs.temp_insitu_c, 1)}</td>
                  <td>{formatNumber(obs.humidity_insitu_pct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
