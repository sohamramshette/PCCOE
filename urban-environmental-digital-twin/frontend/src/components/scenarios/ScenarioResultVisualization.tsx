import React from 'react';
import {
  SlidersHorizontal,
  Layers,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
  Car,
  Factory,
} from 'lucide-react';
import {
  ScenarioResponse,
  ScenarioRunResponse,
  ScenarioResultResponse,
  FeatureAuditItem,
} from '../../types/scenario';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ScenarioComparisonChart } from '../charts/ScenarioComparisonChart';
import { FeatureAuditTable } from './FeatureAuditTable';
import { AiScenarioAnalysis } from './AiScenarioAnalysis';
import { formatNumber, formatDateTime } from '../../utils/formatters';

interface ScenarioResultVisualizationProps {
  scenario: ScenarioResponse | null;
  activeResult: ScenarioRunResponse | null;
  pastResults: ScenarioResultResponse[];
  running: boolean;
  stationName?: string;
}

export const ScenarioResultVisualization: React.FC<ScenarioResultVisualizationProps> = ({
  scenario,
  activeResult,
  pastResults,
  running,
  stationName = 'Monitoring Network',
}) => {
  // 1. Loading State
  if (running) {
    return (
      <div className="card" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
        <LoadingSpinner message="Simulating counterfactual model output across ML feature pipeline..." />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Applying feature transformations and evaluating baseline serving model...
        </div>
      </div>
    );
  }

  // Determine current result to display (active run or latest past result)
  const latestPastResult = pastResults.length > 0 ? pastResults[0] : null;

  // 2. Empty State (No scenario selected or scenario not executed yet)
  if (!activeResult && !latestPastResult) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed var(--border-subtle)' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <SlidersHorizontal size={24} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          Run a scenario to see counterfactual results.
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto' }}>
          {scenario
            ? `Click "Execute Counterfactual Simulation" above to evaluate scenario "${scenario.scenario_name}".`
            : 'Select or create a What-If policy scenario to inspect counterfactual air quality estimates.'}
        </p>
      </div>
    );
  }

  // Extract result metrics safely from either activeRunResult or latestPastResult
  const baselinePm25 = activeResult
    ? activeResult.baseline_prediction_pm25
    : latestPastResult
    ? latestPastResult.baseline_pm25
    : 0;

  const counterfactualPm25 = activeResult
    ? activeResult.counterfactual_prediction_pm25
    : latestPastResult
    ? latestPastResult.scenario_pm25
    : 0;

  const absoluteChange = activeResult
    ? activeResult.absolute_change_pm25
    : latestPastResult
    ? latestPastResult.delta_pm25
    : 0;

  const percentageChange = activeResult
    ? activeResult.percentage_change
    : latestPastResult
    ? latestPastResult.pct_change
    : 0;

  const unit = activeResult?.unit || latestPastResult?.unit || 'µg/m³';
  const displayUnit = unit === 'ug/m3' ? 'µg/m³' : unit;

  const interpretationNote =
    activeResult?.interpretation_note ||
    latestPastResult?.interpretation_note ||
    'Counterfactual model estimate; not a causal measurement.';

  const uncertaintyNote =
    activeResult?.uncertainty_note ||
    'Point estimate only; the current baseline model does not provide calibrated uncertainty.';

  // Feature audit items
  const auditItems: FeatureAuditItem[] = activeResult?.affected_features_audit
    ? activeResult.affected_features_audit
    : (latestPastResult?.metadata_json?.affected_features_audit as unknown as FeatureAuditItem[]) || [];

  // Temporal references
  const baselineTime = activeResult?.baseline_timestamp_utc || scenario?.baseline_timestamp_utc || latestPastResult?.baseline_timestamp_utc;
  const targetTime = activeResult?.target_timestamp_utc || latestPastResult?.target_time_utc;

  // Intervention details
  const trafficReduction = scenario?.traffic_reduction_pct ?? (activeResult?.intervention?.traffic_reduction_percent as number | undefined) ?? 0;
  const industrialReduction = scenario?.industrial_reduction_pct ?? (activeResult?.intervention?.industrial_activity_reduction_percent as number | undefined) ?? 0;

  return (
    <div className="card" style={{ border: '1px solid var(--border-blue)' }}>
      {/* 1. Header & Summary Section */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-scenario">MODEL COUNTERFACTUAL ESTIMATE</span>
            <ProvenanceBadge classification="MODEL_COUNTERFACTUAL_ESTIMATE" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {scenario?.scenario_name || activeResult?.scenario_id || 'Scenario Result Analysis'}
          </h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={13} className="text-primary" />
              {stationName} ({scenario?.station_id || activeResult?.station_id || 'Network'})
            </span>
            {baselineTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} className="text-primary" />
                Baseline: {formatDateTime(baselineTime)}
              </span>
            )}
            {targetTime && (
              <span>Target (t+1): {formatDateTime(targetTime)}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success" style={{ fontWeight: 600 }}>
            {scenario?.simulation_status || 'COMPLETED'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
        {/* 2. Critical Model Estimate Warning Banner */}
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 700, marginBottom: '0.35rem' }}>
            <AlertTriangle size={18} />
            <span>MODEL ESTIMATE NOTICE</span>
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            Counterfactual values are model estimates produced by the digital twin scenario engine. They are not observed measurements.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div>• {interpretationNote}</div>
            <div>• {uncertaintyNote}</div>
            <div>• Results represent a modeled what-if intervention under ceteris paribus conditions; not a guaranteed or real-world causal proof.</div>
          </div>
        </div>

        {/* 3. Key Numerical Result Cards */}
        <div className="stat-grid" style={{ marginBottom: 0 }}>
          {/* Baseline PM2.5 */}
          <div className="stat-tile">
            <div className="stat-label">Baseline PM2.5</div>
            <div className="stat-value">
              {formatNumber(baselinePm25, 2)} <span className="stat-unit">{displayUnit}</span>
            </div>
            <div className="stat-subtext">Original historical condition</div>
          </div>

          {/* Counterfactual PM2.5 */}
          <div className="stat-tile">
            <div className="stat-label">Counterfactual PM2.5</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>
              {formatNumber(counterfactualPm25, 2)} <span className="stat-unit">{displayUnit}</span>
            </div>
            <div className="stat-subtext">Model estimate after intervention</div>
          </div>

          {/* Absolute Change */}
          <div className="stat-tile">
            <div className="stat-label">Absolute Change</div>
            <div
              className="stat-value"
              style={{
                color: absoluteChange < 0 ? '#10b981' : absoluteChange > 0 ? '#f59e0b' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.2rem',
              }}
            >
              {absoluteChange < 0 ? <TrendingDown size={20} /> : absoluteChange > 0 ? <TrendingUp size={20} /> : <Minus size={18} />}
              <span>{absoluteChange > 0 ? '+' : ''}{formatNumber(absoluteChange, 2)}</span>
              <span className="stat-unit">{displayUnit}</span>
            </div>
            <div className="stat-subtext">Delta = Counterfactual - Baseline</div>
          </div>

          {/* Relative Percentage Change */}
          <div className="stat-tile">
            <div className="stat-label">Relative Change</div>
            <div
              className="stat-value"
              style={{
                color: percentageChange < 0 ? '#10b981' : percentageChange > 0 ? '#f59e0b' : 'var(--text-primary)',
              }}
            >
              {percentageChange > 0 ? '+' : ''}{formatNumber(percentageChange, 2)}%
            </div>
            <div className="stat-subtext">Efficacy relative to baseline</div>
          </div>

          {/* Intervention Magnitude */}
          <div className="stat-tile">
            <div className="stat-label">Intervention Magnitude</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>
              {trafficReduction > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309' }}>
                  <Car size={16} />
                  <span>Traffic: -{trafficReduction}%</span>
                </div>
              )}
              {industrialReduction > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', marginTop: trafficReduction > 0 ? '0.2rem' : 0 }}>
                  <Factory size={16} />
                  <span>Ind: -{industrialReduction}%</span>
                </div>
              )}
              {trafficReduction === 0 && industrialReduction === 0 && (
                <span style={{ color: 'var(--text-muted)' }}>0% (No reduction)</span>
              )}
            </div>
            <div className="stat-subtext">
              {trafficReduction > 0 && `m_traffic = ${(1 - trafficReduction / 100).toFixed(2)} `}
              {industrialReduction > 0 && `m_ind = ${(1 - industrialReduction / 100).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* 4. Primary Recharts Comparison Chart */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <SlidersHorizontal size={16} color="var(--primary)" />
            <span>Baseline vs Counterfactual PM2.5 Comparison</span>
          </h4>
          <ScenarioComparisonChart
            baselinePm25={baselinePm25}
            counterfactualPm25={counterfactualPm25}
            stationName={stationName}
          />
        </div>

        {/* AI Policy Impact Brief & Civic Recommendations */}
        {(scenario?.scenario_id || activeResult?.scenario_id) && (
          <AiScenarioAnalysis
            scenarioId={scenario?.scenario_id || activeResult?.scenario_id || ''}
            isSimulated={Boolean(activeResult || latestPastResult)}
          />
        )}

        {/* 5. Intervention Explanation & Core Feature Transformations */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <Layers size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Intervention Explanation & Feature Transformation Audit
            </h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
            The counterfactual simulation strictly modifies engineered features defined in the model feature store.
            {trafficReduction > 0 && (
              <> A <strong>{trafficReduction}% traffic reduction</strong> applies multiplier <code>x{(1 - trafficReduction / 100).toFixed(4)}</code> to diurnal mobility proxies, traffic-stagnation ratios, and POI density interactions.</>
            )}
            {industrialReduction > 0 && (
              <> An <strong>{industrialReduction}% industrial reduction</strong> scales active facility presence and atmospheric dispersion indicators by multiplier <code>x{(1 - industrialReduction / 100).toFixed(4)}</code>.</>
            )}
          </p>

          <FeatureAuditTable auditItems={auditItems} />
        </div>

        {/* 6. Provenance & Reproducibility Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} />
            <span>Model Serving Engine: <code>gradient_boosting_baseline</code></span>
          </div>
          <div>Ceteris Paribus Policy Evaluation • Ground Observations Preserved</div>
        </div>
      </div>
    </div>
  );
};
