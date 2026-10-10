import React, { useState } from 'react';
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
import { Activity, Info, ShieldCheck, Target } from 'lucide-react';
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
  const [showCorridor, setShowCorridor] = useState<boolean>(true);

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

  const chartData = trajectoryData.trajectory.slice(0, selectedHorizon).map((p) => {
    const isAnchor = [1, 3, 6, 12, 24].includes(p.step);
    return {
      ...p,
      isAnchor,
      hourLabel: formatISTHour(p.target_time_utc),
      confidenceBand: [p.lower_bound_pm25, p.upper_bound_pm25],
    };
  });

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

  const renderAnchorDot = (dotProps: any) => {
    const { cx, cy, payload } = dotProps;
    if (!cx || !cy) {
      return <circle key={`dot-empty-${payload?.step || 0}`} cx={0} cy={0} r={0} opacity={0} />;
    }
    if (payload?.isAnchor) {
      return (
        <g key={`anchor-dot-${payload.step}`}>
          <circle cx={cx} cy={cy} r={6} fill="#0284c7" stroke="#ffffff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={9} fill="none" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="2 2" opacity={0.85} />
        </g>
      );
    }
    return <circle key={`dot-${payload?.step || 0}`} cx={cx} cy={cy} r={3} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />;
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

        {/* Controls: Corridor Toggle & Horizon Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Corridor Toggle */}
          <button
            onClick={() => setShowCorridor(!showCorridor)}
            className={`btn ${showCorridor ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
            title="Toggle Calibrated p10–p90 Quantile Corridor"
          >
            <ShieldCheck size={14} />
            <span>{showCorridor ? '80% Corridor (p10–p90) Active' : 'Corridor Hidden'}</span>
          </button>

          {/* Horizon Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
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
                  const data = payload[0].payload as TrajectoryPoint & { hourLabel: string; isAnchor?: boolean };
                  return (
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        border: '1px solid var(--border-blue)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        fontSize: '0.82rem',
                        minWidth: '240px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatDateTimeIST(data.target_time_utc)}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                          t+{data.step}h
                        </span>
                      </div>

                      {data.isAnchor && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.4rem', width: '100%' }}>
                          <Target size={12} /> Direct Horizon Anchor Model
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Predicted PM2.5:</span>
                        <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{data.predicted_pm25} µg/m³</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        <span>80% Quantile Corridor:</span>
                        <span style={{ fontWeight: 500 }}>p₁₀: {data.lower_bound_pm25} – p₉₀: {data.upper_bound_pm25} µg/m³</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>NAQI Tier:</span>
                        <strong style={{ color: getAqiColor(data.aqi_category) }}>{data.aqi_category}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.35rem' }}>
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
            {showCorridor && (
              <>
                <Area
                  type="monotone"
                  dataKey="upper_bound_pm25"
                  stroke="transparent"
                  fill="rgba(37, 99, 235, 0.14)"
                  name="Quantile Corridor (p90)"
                />
                <Area
                  type="monotone"
                  dataKey="lower_bound_pm25"
                  stroke="transparent"
                  fill="#ffffff"
                />
              </>
            )}

            {/* Primary Predicted Trajectory Curve with Direct Anchor indicators */}
            <Line
              type="monotone"
              dataKey="predicted_pm25"
              stroke="#2563eb"
              strokeWidth={2.8}
              dot={renderAnchorDot}
              activeDot={{ r: 7, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 3, backgroundColor: '#2563eb', borderRadius: 2 }} />
            <span>Predicted Trajectory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px dashed #0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#0284c7' }} />
            </span>
            <span>Direct Horizon Anchors (t+1, 3, 6, 12, 24h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 8, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: 2 }} />
            <span>80% Quantile Corridor (p₁₀–p₉₀)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 14, height: 2, borderTop: '2px dashed #d97706' }} />
            <span>NAAQS (60 µg/m³)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Info size={13} color="var(--primary)" />
          <span>Hybrid Direct Horizon Anchors + Autoregressive Propagation with Pinball Quantiles</span>
        </div>
      </div>
    </div>
  );
};
