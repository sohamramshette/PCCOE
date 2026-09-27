import React from 'react';
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
} from 'lucide-react';
import {
  BASELINE_MODELS_BENCHMARK,
  EXTENDED_BENCHMARK_11613,
  TOP_PREDICTIVE_FEATURES,
  TEMPORAL_SPLIT_INFO,
  DOCUMENTED_MODEL_LIMITATIONS,
} from '../data/modelPerformanceData';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { formatNumber } from '../utils/formatters';

export const ModelPerformance: React.FC = () => {
  // Chart data: Comparing Test MAE and Test RMSE
  const chartData = BASELINE_MODELS_BENCHMARK.map((m) => ({
    name: m.modelName.replace(' Regressor', '').replace(' Baseline', ''),
    'Test MAE': m.testMae,
    'Test RMSE': m.testRmse,
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} dy={8} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" µg/m³" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    color: '#0f172a',
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
