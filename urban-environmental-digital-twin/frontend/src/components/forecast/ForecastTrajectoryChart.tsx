import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Activity, Info } from 'lucide-react';
import { ForecastTrajectoryResponse, TrajectoryPoint } from '../../types/forecast';
import { formatNumber, formatDateTimeIST } from '../../utils/formatters';

interface ForecastTrajectoryChartProps {
  trajectoryData: ForecastTrajectoryResponse;
  selectedHorizon: number;
  onHorizonChange: (hours: number) => void;
  loading?: boolean;
}

export const ForecastTrajectoryChart: React.FC<ForecastTrajectoryChartProps> = ({
  trajectoryData,
  selectedHorizon,
  onHorizonChange,
  loading = false,
}) => {


  const formatISTHour = (isoUtc: string) => {
    try {
      const dt = new Date(isoUtc);
      return dt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoUtc;
    }
  };

  const chartData = trajectoryData.trajectory.slice(0, selectedHorizon).map((p) => ({
    ...p,
    hourLabel: formatISTHour(p.target_time_utc),
    confidenceBand: [p.lower_bound_pm25, p.upper_bound_pm25],
  }));

  const getAqiColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'good':
        return '#059669';
      case 'satisfactory':
        return '#10b981';
      case 'moderate':
        return '#d97706';
      case 'poor':
        return '#ea580c';
      case 'very poor':
        return '#dc2626';
      case 'severe':
        return '#7f1d1d';
      default:
        return '#2563eb';
    }
  };

  return (
    <div className="card" style={{ border: '1px solid var(--border-blue)', boxShadow: 'var(--shadow-md)' }}>
      {/* Header with Title and Horizon Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-scenario">MULTI-STEP TIME SERIES</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Station: {trajectoryData.station_name}
            </span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--primary)" />
            <span>24-Hour Future PM2.5 Forecast Trajectory</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Continuous multi-step autoregressive model projections initialized at {formatDateTimeIST(trajectoryData.initialization_time_utc)}
          </p>
        </div>

        {/* Horizon Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => onHorizonChange(12)}
            className={`btn ${selectedHorizon === 12 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            disabled={loading}
          >
            12 Hours
          </button>
          <button
            onClick={() => onHorizonChange(24)}
            className={`btn ${selectedHorizon === 24 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
            disabled={loading}
          >
            24 Hours
          </button>
        </div>
      </div>

      {/* Stat Tiles: 24h Summary */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-tile">
          <div className="stat-label">24-Hour Peak PM2.5</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {formatNumber(trajectoryData.peak_predicted_pm25, 1)} <span className="stat-unit">µg/m³</span>
          </div>
          <div className="stat-subtext">Peak at {formatISTHour(trajectoryData.peak_target_time_utc)}</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">24-Hour Minimum</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {formatNumber(trajectoryData.min_predicted_pm25, 1)} <span className="stat-unit">µg/m³</span>
          </div>
          <div className="stat-subtext">Cleanest at {formatISTHour(trajectoryData.min_target_time_utc)}</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">Mean 24h Average</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {formatNumber(trajectoryData.average_predicted_pm25, 1)} <span className="stat-unit">µg/m³</span>
          </div>
          <div className="stat-subtext">Daily exposure baseline</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">Dominant NAQI Tier</div>
          <div
            className="stat-value"
            style={{
              fontSize: '1.2rem',
              color: getAqiColor(trajectoryData.dominant_naqi_category),
            }}
          >
            {trajectoryData.dominant_naqi_category}
          </div>
          <div className="stat-subtext">Most frequent air quality level</div>
        </div>
      </div>

      {/* Recharts Continuous Trajectory Chart */}
      <div style={{ width: '100%', height: 340, marginTop: '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              interval="preserveStartEnd"
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              unit=" µg"
              domain={[0, 'dataMax + 15']}
            />

            {/* Indian CPCB 24-hr Standard Line (60 ug/m3) */}
            <ReferenceLine
              y={60}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{
                value: 'NAAQS Standard (60 µg/m³)',
                position: 'top',
                fill: '#d97706',
                fontSize: 10,
              }}
            />

            {/* WHO Guideline Line (15 ug/m3) */}
            <ReferenceLine
              y={15}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                value: 'WHO Guideline (15 µg/m³)',
                position: 'bottom',
                fill: '#059669',
                fontSize: 10,
              }}
            />

            {/* Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload as TrajectoryPoint & { hourLabel: string };
                  return (
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        border: '1px solid var(--border-blue)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        fontSize: '0.82rem',
                        minWidth: '220px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
                        {formatDateTimeIST(data.target_time_utc)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Predicted PM2.5:</span>
                        <strong style={{ color: 'var(--primary)' }}>{data.predicted_pm25} µg/m³</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        <span>95% Confidence:</span>
                        <span>[{data.lower_bound_pm25} – {data.upper_bound_pm25}]</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>NAQI Tier:</span>
                        <strong style={{ color: getAqiColor(data.aqi_category) }}>{data.aqi_category}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.3rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.3rem' }}>
                        <span>Traffic Index: {data.traffic_proxy_index}</span>
                        <span>Ventilation: {data.ventilation_index} m²/s</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Shaded Compounding Confidence Area */}
            <Area
              type="monotone"
              dataKey="upper_bound_pm25"
              stroke="transparent"
              fill="rgba(37, 99, 235, 0.12)"
              name="Confidence Interval"
            />
            <Area
              type="monotone"
              dataKey="lower_bound_pm25"
              stroke="transparent"
              fill="#ffffff"
            />

            {/* Primary Predicted Trajectory Curve */}
            <Line
              type="monotone"
              dataKey="predicted_pm25"
              stroke="#2563eb"
              strokeWidth={2.8}
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
              name="Forecasted PM2.5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Scientific Transparency Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 3, backgroundColor: '#2563eb', borderRadius: 2 }} />
            <span>Predicted Trajectory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 8, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: 2 }} />
            <span>95% Compounding Bounds</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 2, borderTop: '2px dashed #d97706' }} />
            <span>NAAQS (60 µg/m³)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Info size={13} color="var(--primary)" />
          <span>Autoregressive recursive feature propagation across {selectedHorizon} hours</span>
        </div>
      </div>
    </div>
  );
};
