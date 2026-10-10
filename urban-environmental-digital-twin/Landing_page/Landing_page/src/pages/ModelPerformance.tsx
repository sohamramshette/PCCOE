import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Cpu,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Info,
  ShieldCheck,
  Layers,
  Activity,
  Target,
  WifiOff,
  Radio,
} from 'lucide-react';
import {
  BASELINE_MODELS_BENCHMARK,
  EXTENDED_BENCHMARK_11613,
  TOP_PREDICTIVE_FEATURES,
  TEMPORAL_SPLIT_INFO,
  DOCUMENTED_MODEL_LIMITATIONS,
  QUANTILE_REGRESSION_BENCHMARK,
  QUANTILE_CALIBRATION_SUMMARY,
  MULTI_HORIZON_BENCHMARK,
  SENSOR_LOSS_BENCHMARK,
  HELD_OUT_LOCATION_EVALUATION,
  NON_CAUSAL_METHODOLOGICAL_DISCLAIMER,
} from '../data/modelPerformanceData';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { formatNumber } from '../utils/formatters';

export const ModelPerformance: React.FC = () => {
  const [selectedLossPct, setSelectedLossPct] = useState<number>(0);

  // Chart data: Comparing Test MAE and Test RMSE
  const chartData = BASELINE_MODELS_BENCHMARK.map((m) => ({
    name: m.modelName.replace(' Regressor', '').replace(' Baseline', ''),
    'Test MAE': m.testMae,
    'Test RMSE': m.testRmse,
  }));

  // Chart data: Direct Multi-Horizon Test MAE & RMSE
  const multiHorizonChartData = MULTI_HORIZON_BENCHMARK.map((h) => ({
    horizon: h.horizon,
    'Test MAE': h.testMae,
    'Test RMSE': h.testRmse,
  }));

  // Chart data: Sensor Loss Comparison across baselines
  const sensorLossChartData = SENSOR_LOSS_BENCHMARK.map((s) => ({
    name: s.lossLevel.replace(' Sensor Loss', ' Loss'),
    'Universal ML (Spatial-Met)': s.mlMae,
    'Spatial IDW': s.idwMae,
    'Persistence': s.persistenceMae,
  }));

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-scenario">MODEL BENCHMARKING</span>
            <ProvenanceBadge classification="PREDICTED" />
          </div>
          <h1 className="page-title">Model Performance & Evaluation</h1>
          <p className="page-subtitle">
            Empirical validation of baseline machine learning architectures for next-hour PM2.5 forecasting
          </p>
        </div>
      </div>

      {/* Section A: Overview */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Cpu size={18} className="text-primary" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Forecasting Objective & Methodology</h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          The system forecasts next-hour ambient Particulate Matter &le; 2.5 &micro;m (<code>target_pm25_t_plus_1</code> in &micro;g/m&sup3;) across all six monitoring stations in the Pune metropolitan network. Predictions are generated as a function y&#770;(s, t+1) = f(x(s, t)) using multi-domain predictors available strictly at or prior to forecast initialization hour t: contemporaneous particulate observations, autoregressive lags, rolling temporal statistics, ECMWF ERA5-Land atmospheric meteorology, boundary layer dispersion parameters, road exposure buffers, and urban activity proxies.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Info size={14} className="text-primary" />
          <span>Evaluation Metric Guidance: Lower MAE and RMSE indicate smaller prediction error; higher R² indicates greater explained variance.</span>
        </div>
      </div>

      {/* Section C & D: Validation Metrics Table & Grouped Bar Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Table Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={16} className="text-primary" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Consolidated Performance Matrix</h3>
            </div>
            <span className="badge badge-primary">Chronological Split</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Model Architecture</th>
                  <th>Val MAE</th>
                  <th>Val RMSE</th>
                  <th>Val R²</th>
                  <th>Test MAE</th>
                  <th>Test RMSE</th>
                  <th>Test R²</th>
                </tr>
              </thead>
              <tbody>
                {BASELINE_MODELS_BENCHMARK.map((m) => (
                  <tr key={m.modelId}>
                    <td>
                      <strong>{m.modelName}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.modelId}</div>
                    </td>
                    <td>{formatNumber(m.valMae, 4)}</td>
                    <td>{formatNumber(m.valRmse, 4)}</td>
                    <td>{formatNumber(m.valR2, 4)}</td>
                    <td><strong>{formatNumber(m.testMae, 4)}</strong></td>
                    <td>{formatNumber(m.testRmse, 4)}</td>
                    <td>{formatNumber(m.testR2, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Note: Units are µg/m³ for MAE/RMSE. All metrics computed over strictly observed targets (target_available == 1). Target values were never imputed.
          </div>
        </div>

        {/* Chart Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={16} className="text-primary" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Holdout Test Error Comparison</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units: PM2.5 error (µg/m³)</span>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(163, 181, 147, 0.14)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} dy={8} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" µg/m³" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(20, 27, 19, 0.95)',
                    borderColor: 'rgba(163, 181, 147, 0.25)',
                    borderRadius: '12px',
                    color: '#eef1e7',
                  }}
                  formatter={(val: unknown, name: string) => [`${formatNumber(Number(val), 2)} µg/m³`, name]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                <Bar dataKey="Test MAE" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="Test RMSE" fill="#f97316" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section B: Models Evaluated Detailed Cards */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Layers size={16} className="text-primary" />
          <span>Evaluated Model Configurations (Core Feature Set: 98 Raw / 114 Encoded)</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {BASELINE_MODELS_BENCHMARK.map((m) => (
            <div
              key={m.modelId}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.modelName}</h4>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                {m.architecture}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                <strong>Inductive Bias:</strong> {m.inductiveBias}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <strong>Pipeline:</strong> {m.pipeline}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extended Benchmark Experiment (Station 11613 Specific) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Extended Benchmark Experiment (Station 11613 — Shivajinagar)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Evaluation comparing Universal Network Model vs Single-Station Model with in-situ co-pollutants (PM10, NO2)
            </p>
          </div>
          <span className="badge badge-proxy">Single Station Benchmark</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model Configuration</th>
                <th>Training Scope</th>
                <th>Validation MAE</th>
                <th>Validation RMSE</th>
                <th>Holdout Test MAE</th>
                <th>Holdout Test RMSE</th>
                <th>Holdout Test R²</th>
              </tr>
            </thead>
            <tbody>
              {EXTENDED_BENCHMARK_11613.map((eb, idx) => (
                <tr key={idx}>
                  <td><strong>{eb.modelConfig}</strong></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{eb.scope}</td>
                  <td>{formatNumber(eb.valMae, 4)}</td>
                  <td>{formatNumber(eb.valRmse, 4)}</td>
                  <td><strong>{formatNumber(eb.testMae, 4)}</strong></td>
                  <td>{formatNumber(eb.testRmse, 4)}</td>
                  <td>{formatNumber(eb.testR2, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.4 }}>
          Scientific Takeaway: The Universal Network model trained on 42,796 multi-station samples significantly outperformed the single-station model trained on Station 11613 alone ($n = 7,535$), despite the single-station model having co-pollutant inputs. Single-station co-pollutant sensors exhibit seasonal drift between monsoon and winter, whereas network training learns robust synoptic relationships across the metropolitan basin.
        </p>
      </div>

      {/* Production Upgrades: Calibrated Quantile Forecasters & Direct Multi-Horizon Regressors */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-blue)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-success">PRODUCTION UPGRADES</span>
              <span className="badge badge-scenario">PINBALL QUANTILE + DIRECT HORIZON</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Advanced Model Upgrades: Calibrated Uncertainty & Direct Multi-Horizon Regressors
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Eliminating recursive autoregressive drift and providing statistically calibrated confidence corridors (p10 to p90).
            </p>
          </div>
        </div>

        {/* Sub-grid: Quantiles & Multi-Horizon side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Upgrade 1: Quantile Table & Coverage */}
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Target size={16} className="text-primary" />
                <span>Upgrade 1: Pinball Quantile Regressors (p10, p50, p90)</span>
              </h4>
              <span className="badge badge-primary">Conformal Bounds</span>
            </div>

            <div className="table-container" style={{ marginBottom: '0.75rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Quantile Head</th>
                    <th>Fit Time</th>
                    <th>Test Pinball Loss</th>
                    <th>Test MAE</th>
                    <th>Semantic Health Boundary</th>
                  </tr>
                </thead>
                <tbody>
                  {QUANTILE_REGRESSION_BENCHMARK.map((q) => (
                    <tr key={q.percentile}>
                      <td><strong>{q.percentile}</strong></td>
                      <td>{q.fitTimeSeconds}s</td>
                      <td>{formatNumber(q.testPinballLoss, 4)}</td>
                      <td><strong>{formatNumber(q.testMae, 2)} µg/m³</strong></td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{q.semanticRole}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem' }}>
              <div>Nominal Coverage: <strong>{QUANTILE_CALIBRATION_SUMMARY.nominalCoveragePct}%</strong></div>
              <div>Empirical Test Coverage: <strong style={{ color: '#059669' }}>{QUANTILE_CALIBRATION_SUMMARY.empiricalCoveragePct}%</strong></div>
              <div>Avg Interval Width: <strong>{QUANTILE_CALIBRATION_SUMMARY.averageWidthUgM3} µg/m³</strong></div>
            </div>
          </div>

          {/* Upgrade 2: Multi-Horizon Progression Chart */}
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={16} className="text-primary" />
                <span>Upgrade 2: Direct Multi-Horizon Regressors (t+1h to t+24h)</span>
              </h4>
              <span className="badge badge-scenario">Anti-Drift Anchors</span>
            </div>

            <div style={{ width: '100%', height: 200, marginBottom: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={multiHorizonChartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163, 181, 147, 0.14)" />
                  <XAxis dataKey="horizon" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" µg" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(20, 27, 19, 0.95)', borderColor: 'rgba(163, 181, 147, 0.25)', borderRadius: '10px', fontSize: '11px', color: '#eef1e7' }}
                    formatter={(val: unknown, name: string) => [`${formatNumber(Number(val), 2)} µg/m³`, name]}
                  />
                  <Bar dataKey="Test MAE" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="Test RMSE" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Direct multi-horizon models train independent heads for t+1h, t+3h, t+6h, t+12h, and t+24h, preventing error compounding over recursive 24-hour autoregressive loops.
            </div>
          </div>
        </div>

        {/* Detailed Multi-Horizon Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Horizon</th>
                <th>Lead Time</th>
                <th>Validation MAE</th>
                <th>Test MAE</th>
                <th>Test RMSE</th>
                <th>Test R²</th>
                <th>Governing Physical & Dispersion Dynamics</th>
              </tr>
            </thead>
            <tbody>
              {MULTI_HORIZON_BENCHMARK.map((h) => (
                <tr key={h.horizon}>
                  <td><span className="badge badge-primary">{h.horizon}</span></td>
                  <td>{h.leadHours} hour(s)</td>
                  <td>{formatNumber(h.valMae, 3)}</td>
                  <td><strong>{formatNumber(h.testMae, 3)} µg/m³</strong></td>
                  <td>{formatNumber(h.testRmse, 3)}</td>
                  <td>{formatNumber(h.testR2, 4)}</td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{h.keyDrivers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Addition 2: Sensor Resilience & Spatial Transferability Lab (HackMatrix 5.0) */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #0284c7', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-scenario">HACKMATRIX 5.0 ADDITION 2</span>
              <span className="badge badge-success">SENSOR RESILIENCE & SPATIAL TRANSFER</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <WifiOff size={20} color="#0284c7" />
              <span>Forecasting Under Sensor Outages & Unseen Held-Out Locations</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Empirical stress-testing across declared sensor-loss levels (0%, 25%, 50%, 100%) and spatial transfer to an unmonitored location withheld from model development.
            </p>
          </div>

          {/* Level Selector Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {SENSOR_LOSS_BENCHMARK.map((sl) => (
              <button
                key={sl.lossPct}
                onClick={() => setSelectedLossPct(sl.lossPct)}
                className={`btn ${selectedLossPct === sl.lossPct ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', border: 'none', cursor: 'pointer' }}
              >
                {sl.lossLevel}
              </button>
            ))}
          </div>
        </div>

        {/* Highlight Banner for selected level */}
        {(() => {
          const activeSl = SENSOR_LOSS_BENCHMARK.find((s) => s.lossPct === selectedLossPct) || SENSOR_LOSS_BENCHMARK[0];
          return (
            <div style={{ backgroundColor: selectedLossPct === 100 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(2, 132, 199, 0.08)', border: `1px solid ${selectedLossPct === 100 ? '#ef4444' : '#0284c7'}`, borderRadius: '8px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.9rem', color: selectedLossPct === 100 ? '#dc2626' : '#0284c7' }}>
                  Active Stress-Test Scenario: {activeSl.lossLevel} ({activeSl.lossPct}% Telemetry Dropout)
                </strong>
                <span className="badge badge-primary">
                  Corridor Width: {activeSl.corridorWidthUgM3} µg/m³ ({activeSl.empiricalCoveragePct}% Empirical Coverage)
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {activeSl.operationalImpact}
              </p>
            </div>
          );
        })()}

        {/* Sub-grid: Comparative Chart + Held-out Location Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Comparative Escalation Bar Chart */}
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={16} className="text-primary" />
                <span>Error Escalation (Holdout Test MAE vs. Sensor Dropout)</span>
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lower error = superior resilience</span>
            </div>

            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sensorLossChartData} margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163, 181, 147, 0.14)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" µg" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(20, 27, 19, 0.95)', borderColor: 'rgba(163, 181, 147, 0.25)', borderRadius: '10px', fontSize: '11px', color: '#eef1e7' }}
                    formatter={(val: unknown, name: string) => [`${formatNumber(Number(val), 2)} µg/m³`, name]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '6px' }} />
                  <Bar dataKey="Universal ML (Spatial-Met)" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Spatial IDW" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Persistence" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Key Insight: At 100% sensor loss, in-situ persistence fails (MAE 18.42 µg/m³). The Universal ML model degrades gracefully to 6.37 µg/m³, outperforming Spatial IDW (7.29 µg/m³) via OpenStreetMap GIS and ERA5 dispersion terms.
            </div>
          </div>

          {/* Withheld Location Spotlight: Station 11613 (Shivajinagar) */}
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Radio size={16} color="#0284c7" />
                  <span>Held-Out Location Spatial Transfer (Station 11613)</span>
                </h4>
                <span className="badge badge-scenario">Leave-One-Station-Out</span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Target: <strong>{HELD_OUT_LOCATION_EVALUATION.withheldStationName}</strong> ({HELD_OUT_LOCATION_EVALUATION.nSamples} test samples).
                Simulating deployment to an unmonitored Pune neighborhood with <em>zero in-situ historical training data</em>.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', border: '1px solid #2563eb', borderRadius: '6px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Universal ML</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563eb' }}>{HELD_OUT_LOCATION_EVALUATION.mlSpatialTransfer.mae}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>µg/m³ MAE (Zero Sensors)</div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Spatial IDW</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0284c7' }}>{HELD_OUT_LOCATION_EVALUATION.spatialIdwBaseline.mae}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>µg/m³ MAE (5 Neighbors)</div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Persistence</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>{HELD_OUT_LOCATION_EVALUATION.persistenceBaseline.mae}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Requires Hardware</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '0.6rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #0284c7' }}>
              <strong>Transferability Verdict:</strong> The universal model accurately estimates unseen municipal zones by encoding physical road density buffers (major road density: 1.5 km/km²), commercial POI activity, and ERA5 planetary boundary layer ventilation.
            </div>
          </div>
        </div>

        {/* Detailed Benchmark Table Across All Declared Sensor Loss Levels */}
        <div className="table-container" style={{ marginBottom: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Declared Telemetry Level</th>
                <th>Universal ML (Test MAE)</th>
                <th>Universal ML (Test RMSE)</th>
                <th>Spatial IDW Baseline</th>
                <th>Persistence Baseline</th>
                <th>Quantile Corridor (p10–p90)</th>
                <th>Operational Stability & Risk Assessment</th>
              </tr>
            </thead>
            <tbody>
              {SENSOR_LOSS_BENCHMARK.map((sl) => (
                <tr
                  key={sl.lossPct}
                  style={{
                    backgroundColor: selectedLossPct === sl.lossPct ? 'rgba(2, 132, 199, 0.08)' : undefined,
                    fontWeight: selectedLossPct === sl.lossPct ? 600 : undefined,
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className={`badge ${sl.lossPct === 0 ? 'badge-success' : sl.lossPct === 100 ? 'badge-danger' : 'badge-primary'}`}>
                        {sl.lossLevel}
                      </span>
                    </div>
                  </td>
                  <td><strong style={{ color: '#2563eb' }}>{formatNumber(sl.mlMae, 3)} µg/m³</strong></td>
                  <td>{formatNumber(sl.mlRmse, 3)}</td>
                  <td>{formatNumber(sl.idwMae, 3)} µg/m³</td>
                  <td>
                    {sl.lossPct === 100 ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{sl.persistenceStatus}</span>
                    ) : (
                      `${formatNumber(sl.persistenceMae, 3)} µg/m³`
                    )}
                  </td>
                  <td>
                    <span>± {formatNumber(sl.corridorWidthUgM3 / 2, 2)} µg</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                      width: {sl.corridorWidthUgM3} µg ({sl.empiricalCoveragePct}% cov)
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sl.operationalImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mandatory Non-Causal Methodological Disclaimer Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid #d97706',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.78rem',
            color: 'var(--text-primary)',
          }}
        >
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Documented Reliability & Scientific Non-Causal Disclaimer:</strong>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {NON_CAUSAL_METHODOLOGICAL_DISCLAIMER}
            </p>
            <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Reproducible experiment script: <code>ml/src/experiments/simulate_sensor_loss.py</code> | Benchmark Artifact: <code>ml/results/sensor_loss_benchmark.json</code>
            </div>
          </div>
        </div>
      </div>

      {/* Section E: Temporal Split Specifications */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <Calendar size={16} className="text-primary" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Chronological Train / Validation / Test Partitions</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {TEMPORAL_SPLIT_INFO.map((ts) => (
            <div
              key={ts.split}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="badge badge-primary">{ts.split}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capture: {ts.targetCaptureRate}</span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.3rem 0' }}>
                {ts.range}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Observed Targets: <strong>{formatNumber(ts.validObservedTargets, 0)}</strong> / {formatNumber(ts.totalStationHours, 0)} station-hours
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {ts.role}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          • Leakage Guarantee: The Test partition (July–September 2026) is strictly contiguous and temporally later than Train and Validation partitions. The scikit-learn preprocessor was fitted exclusively on the Training block.
        </div>
      </div>

      {/* Section F: Model Interpretation & Feature Attribution */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} className="text-primary" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Feature Importance & Domain Attribution</h3>
          </div>
          <span className="badge badge-scenario">Gini & Permutation Loss</span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Audit of the top predictive features derived from Random Forest Gini variance reduction and HistGradientBoosting validation permutation loss.
        </p>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Feature Name</th>
                <th>Domain Category</th>
                <th>Gini Importance</th>
                <th>Permutation MAE Loss</th>
                <th>Predictive Role</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PREDICTIVE_FEATURES.map((feat) => (
                <tr key={feat.rank}>
                  <td><strong>#{feat.rank}</strong></td>
                  <td><code>{feat.featureName}</code></td>
                  <td><span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{feat.domain}</span></td>
                  <td>{formatNumber(feat.giniImportance, 4)}</td>
                  <td style={{ color: feat.permutationMaeLoss > 0.1 ? '#f59e0b' : 'inherit' }}>
                    +{formatNumber(feat.permutationMaeLoss, 4)}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{feat.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginTop: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.2rem' }}>
            Scientific Notice on Feature Attribution:
          </div>
          Feature importance quantifies predictive association and information gain within the statistical model architecture. It does NOT represent physical or causal influence. The model does not establish that changing an engineered feature causes a real-world PM2.5 change.
        </div>
      </div>

      {/* Section G: Important Limitations */}
      <div
        className="card"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 600, marginBottom: '0.75rem' }}>
          <AlertTriangle size={18} />
          <h3 style={{ fontSize: '1rem' }}>Documented System Limitations</h3>
        </div>

        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {DOCUMENTED_MODEL_LIMITATIONS.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
