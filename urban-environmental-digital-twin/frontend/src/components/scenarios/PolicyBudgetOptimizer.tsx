import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sliders,
  RefreshCw,
  Layers,
  Leaf,
  Car,
  Factory,
  Zap,
  HardHat,
  Scale,
} from 'lucide-react';
import { optimizeScenarios } from '../../api/scenarios';
import {
  OptimizeResponse,
  PackageInterventions,
} from '../../types/scenario';
import { formatNumber } from '../../utils/formatters';

interface PolicyBudgetOptimizerProps {
  stationId?: number;
  stationName?: string;
}

export const PolicyBudgetOptimizer: React.FC<PolicyBudgetOptimizerProps> = ({
  stationId = 11613,
  stationName = 'Revenue Colony-Shivajinagar, Pune - IITM',
}) => {
  // Optimizer state
  const [budgetLakh, setBudgetLakh] = useState<number>(50.0);
  const [costShockPct, setCostShockPct] = useState<number>(0.0);
  const [responseSensitivityPct, setResponseSensitivityPct] = useState<number>(0.0);
  const [industrialBlocked, setIndustrialBlocked] = useState<boolean>(false);
  const [fixedOverheadLakh] = useState<number>(0.0);

  // Custom package builder state
  const [customEnabled, setCustomEnabled] = useState<boolean>(false);
  const [customTraffic, setCustomTraffic] = useState<number>(20.0);
  const [customEvFleet, setCustomEvFleet] = useState<number>(25.0);
  const [customIndustrial, setCustomIndustrial] = useState<number>(10.0);
  const [customGreenBuffer, setCustomGreenBuffer] = useState<number>(15.0);
  const [customDustMisting, setCustomDustMisting] = useState<boolean>(true);
  const [includeAlternatives, setIncludeAlternatives] = useState<boolean>(true);

  // UI accordion & details state
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>('pkg_c');
  const [showAssumptions, setShowAssumptions] = useState<boolean>(false);
  const [lastBudgetChange, setLastBudgetChange] = useState<number | null>(null);

  // Response data
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OptimizeResponse | null>(null);

  const fetchOptimization = async (
    targetBudget: number = budgetLakh,
    targetShock: number = costShockPct,
    targetSensitivity: number = responseSensitivityPct,
    targetBlocked: boolean = industrialBlocked,
    isCustom: boolean = customEnabled,
    targetAlternatives: boolean = includeAlternatives
  ) => {
    try {
      setLoading(true);
      setError(null);

      const customInterventions: PackageInterventions | null = isCustom
        ? {
            traffic: customTraffic,
            ev_fleet: customEvFleet,
            industrial: customIndustrial,
            green_buffer: customGreenBuffer,
            dust_misting: customDustMisting,
          }
        : null;

      const unavailList = targetBlocked ? ['industrial'] : [];

      const res = await optimizeScenarios({
        budget_lakh: targetBudget,
        custom_interventions: customInterventions,
        unavailable_interventions: unavailList,
        cost_shock_pct: targetShock,
        response_sensitivity_pct: targetSensitivity,
        fixed_overhead_lakh: fixedOverheadLakh,
        station_id: stationId,
        model_id: 'gradient_boosting_baseline',
        include_alternative_combinations: targetAlternatives,
      });

      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute policy optimization.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimization();
  }, [stationId]);

  const handleBudgetChange = (newBudget: number) => {
    setBudgetLakh(newBudget);
    setLastBudgetChange(newBudget);
    fetchOptimization(newBudget, costShockPct, responseSensitivityPct, industrialBlocked, customEnabled, includeAlternatives);
  };

  const handleCostShockChange = (newShock: number) => {
    setCostShockPct(newShock);
    fetchOptimization(budgetLakh, newShock, responseSensitivityPct, industrialBlocked, customEnabled, includeAlternatives);
  };

  const handleSensitivityChange = (newSensitivity: number) => {
    setResponseSensitivityPct(newSensitivity);
    fetchOptimization(budgetLakh, costShockPct, newSensitivity, industrialBlocked, customEnabled, includeAlternatives);
  };

  const handleToggleIndustrialBlocked = (blocked: boolean) => {
    setIndustrialBlocked(blocked);
    fetchOptimization(budgetLakh, costShockPct, responseSensitivityPct, blocked, customEnabled, includeAlternatives);
  };

  const handleToggleCustom = (enabled: boolean) => {
    setCustomEnabled(enabled);
    fetchOptimization(budgetLakh, costShockPct, responseSensitivityPct, industrialBlocked, enabled, includeAlternatives);
  };

  const handleToggleAlternatives = (enabled: boolean) => {
    setIncludeAlternatives(enabled);
    fetchOptimization(budgetLakh, costShockPct, responseSensitivityPct, industrialBlocked, customEnabled, enabled);
  };

  const recommendedPackage = data?.packages.find((p) => p.is_recommended);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Context */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderColor: 'var(--border-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge badge-scenario">Municipal Decision Support</span>
              <span className="badge badge-observed">Pune Clean Air Action Plan</span>
              <span className="badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8' }}>
                Objective: Maximize PM2.5 Reduction
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
              Policy & Budget Optimizer
            </h2>
          </div>
          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Airshed Monitor:</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stationName}</div>
          </div>
        </div>

        {/* Workflow Breadcrumb */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>OPTIMIZER WORKFLOW:</span>
          <span>Baseline</span>
          <span>→</span>
          <span>Declare Budget</span>
          <span>→</span>
          <span>Intervention Matrix</span>
          <span>→</span>
          <span>Check Operational Caps</span>
          <span>→</span>
          <span>Run Counterfactual ML</span>
          <span>→</span>
          <span>Feasibility Scoring</span>
          <span>→</span>
          <span>Sensitivity Shock</span>
        </div>
      </div>

      {error && (
        <div className="toast toast-error" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Interactive Budget & Policy Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem' }}>
        {/* Budget Ceiling Slider */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.5rem' }}>
            <div className="card-title">
              <IndianRupee size={18} color="var(--primary)" />
              <span>Municipal Budget Ceiling</span>
            </div>
            <span className="badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>
              ₹{budgetLakh.toFixed(1)} Lakh
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
            Declare available municipal capital expenditure for seasonal ambient air pollution control.
          </p>

          <input
            id="budget-slider-input"
            type="range"
            min="10"
            max="200"
            step="1"
            value={budgetLakh}
            onChange={(e) => handleBudgetChange(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '0.75rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <span>₹10L (Austerity)</span>
            <span>₹50L (Standard Baseline)</span>
            <span>₹200L (Max Cap)</span>
          </div>

          {/* Budget Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {[
              { label: '₹30L (Constrained)', val: 30 },
              { label: '₹50L (Default)', val: 50 },
              { label: '₹75L (Expanded)', val: 75 },
              { label: '₹100L (Priority)', val: 100 },
              { label: '₹175L (Full Cap)', val: 175 },
            ].map((b) => (
              <button
                key={b.val}
                id={`budget-preset-${b.val}`}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.73rem',
                  backgroundColor: budgetLakh === b.val ? 'var(--primary-soft)' : undefined,
                  borderColor: budgetLakh === b.val ? 'var(--primary)' : undefined,
                  color: budgetLakh === b.val ? 'var(--primary)' : undefined,
                }}
                onClick={() => handleBudgetChange(b.val)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {lastBudgetChange && (
            <div style={{ fontSize: '0.73rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <RefreshCw size={12} />
              <span>Budget set to ₹{budgetLakh.toFixed(1)}L — portfolio feasibility dynamically recomputed.</span>
            </div>
          )}
        </div>

        {/* Constraints & Unavailability Controls */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '0.5rem' }}>
            <div className="card-title">
              <ShieldAlert size={18} color="#dc2626" />
              <span>Operational Limits & Availability</span>
            </div>
            <span className="badge badge-scenario">Admin Governance</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
            Simulate real-world judicial injunctions or administrative gridlocks on specific intervention levers.
          </p>

          {/* Legal Dispute Checkbox */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: industrialBlocked ? 'rgba(239, 68, 68, 0.08)' : '#f8fafc',
              border: `1px solid ${industrialBlocked ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              cursor: 'pointer',
            }}
            onClick={() => handleToggleIndustrialBlocked(!industrialBlocked)}
          >
            <input
              id="toggle-industrial-blocked"
              type="checkbox"
              checked={industrialBlocked}
              onChange={(e) => handleToggleIndustrialBlocked(e.target.checked)}
              style={{ marginTop: '0.2rem', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: industrialBlocked ? '#b91c1c' : 'var(--text-primary)' }}>
                Industrial Action Blocked by Legal Dispute
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Simulates industrial cluster association stay order. Optimizer automatically rejects industrial curtailment
                and reallocates available funds to traffic, EV fleet, and buffers.
              </div>
            </div>
          </div>

          {/* Combinatorial Alternative Search Toggle */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: includeAlternatives ? 'rgba(37, 99, 235, 0.06)' : '#f8fafc',
              border: `1px solid ${includeAlternatives ? 'rgba(37, 99, 235, 0.25)' : 'var(--border-subtle)'}`,
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              cursor: 'pointer',
            }}
            onClick={() => handleToggleAlternatives(!includeAlternatives)}
          >
            <input
              id="toggle-combinatorial-search"
              type="checkbox"
              checked={includeAlternatives}
              onChange={(e) => handleToggleAlternatives(e.target.checked)}
              style={{ marginTop: '0.2rem', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: includeAlternatives ? 'var(--primary)' : 'var(--text-primary)' }}>
                Combinatorial Search: Evaluate 3+ Sector Alternative Portfolios
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Heuristically searches valid intervention combinations across operational steps to discover viable multi-sector
                portfolios satisfying the budget ceiling when benchmark packages exceed spending limits.
              </div>
            </div>
          </div>

          {/* Fixed Overhead Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.4rem 0.6rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Fixed Municipal Administration Overhead:</span>
            <strong>₹{fixedOverheadLakh.toFixed(2)} Lakh</strong>
          </div>
        </div>
      </div>

      {/* 3. Sensitivity Analysis Controls */}
      <div className="card" style={{ borderColor: 'rgba(249, 115, 22, 0.25)', background: '#fffcf9' }}>
        <div className="card-header" style={{ paddingBottom: '0.4rem' }}>
          <div className="card-title">
            <Sliders size={18} color="var(--accent)" />
            <span>Sensitivity Analysis: Cost Shock & Behavioral Response Rebound</span>
          </div>
          <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent)' }}>
            Stress Testing
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
          {/* Dimension A: Cost Shock */}
          <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Implementation Cost Shock:</span>
              <strong style={{ fontSize: '0.9rem', color: costShockPct > 0 ? '#b91c1c' : costShockPct < 0 ? '#047857' : 'var(--text-primary)' }}>
                {costShockPct > 0 ? `+${costShockPct}%` : `${costShockPct}%`}
              </strong>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="5"
              value={costShockPct}
              onChange={(e) => handleCostShockChange(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span>-20% (Subsidized)</span>
              <span>0% (Baseline)</span>
              <span>+20% (Inflationary Shock)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Recalculates all unit costs dynamically. (E.g. +20% shock pushes Package C from ₹45.0L to ₹54.0L).
            </div>
          </div>

          {/* Dimension B: Response Sensitivity */}
          <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Modeled Response Adjustment:</span>
              <strong style={{ fontSize: '0.9rem', color: responseSensitivityPct < 0 ? '#b91c1c' : responseSensitivityPct > 0 ? '#047857' : 'var(--text-primary)' }}>
                {responseSensitivityPct > 0 ? `+${responseSensitivityPct}%` : `${responseSensitivityPct}%`}
              </strong>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={responseSensitivityPct}
              onChange={(e) => handleSensitivityChange(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span>-30% (Severe Rebound)</span>
              <span>0% (Standard Model)</span>
              <span>+30% (Synergistic Compliance)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Simulates driver detour rebound or partial compliance attenuation on counterfactual predictions.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recommended Feasible Package Card */}
      {data && (
        <div
          className="card"
          style={{
            borderColor: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? '#10b981' : '#f59e0b',
            background: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' : '#fffbeb',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {data.recommendation.status === 'FEASIBLE_OPTIMAL' ? (
                <CheckCircle2 size={24} color="#059669" />
              ) : (
                <AlertTriangle size={24} color="#d97706" />
              )}
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? '#047857' : '#b45309',
                  }}
                >
                  {data.recommendation.label}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0 0 0' }}>
                  {data.recommendation.recommended_package_name || 'No Feasible Package Under Stated Constraints'}
                </h3>
              </div>
            </div>

            {recommendedPackage && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #10b981', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Modeled PM2.5 Drop</div>
                  <strong style={{ fontSize: '1.1rem', color: '#047857' }}>
                    {formatNumber(recommendedPackage.modeled_delta_pm25, 2)} µg/m³
                  </strong>
                </div>
                <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Expenditure</div>
                  <strong style={{ fontSize: '1.1rem' }}>₹{recommendedPackage.cost_after_shock_lakh.toFixed(1)}L</strong>
                </div>
                <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Headroom</div>
                  <strong style={{ fontSize: '1.1rem', color: '#047857' }}>₹{recommendedPackage.remaining_budget_lakh.toFixed(1)}L</strong>
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.85rem', lineHeight: 1.5, margin: '0.85rem 0 0 0' }}>
            {data.recommendation.reason}
          </p>
        </div>
      )}

      {/* 5. Package Comparison Grid & Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} color="var(--primary)" />
            <span>Demonstration Portfolio Comparison (Dynamic Evaluation)</span>
          </div>
          <span className="badge badge-scenario">MODELED SCENARIOS</span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
          Costs are computed programmatically from declared unit rates. Feasibility, headroom, and counterfactual
          PM2.5 reductions update synchronously upon any budget change or sensitivity shock.
        </p>

        {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Evaluating portfolio permutations against model baseline...</div>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Composition Levers</th>
                    <th>Calculated Expenditure</th>
                    <th>Budget Status</th>
                    <th>Modeled PM2.5 Before → After</th>
                    <th>Attributed Reduction</th>
                    <th>Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {data.packages.map((pkg) => {
                    const isExpanded = expandedBreakdownId === pkg.package_id;
                    const isFeasible = pkg.is_feasible;

                    return (
                      <React.Fragment key={pkg.package_id}>
                        <tr
                          style={{
                            backgroundColor: pkg.is_recommended ? 'rgba(16, 185, 129, 0.05)' : isFeasible ? 'inherit' : 'rgba(239, 68, 68, 0.02)',
                            fontWeight: pkg.is_recommended ? 600 : 400,
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {pkg.is_recommended && <Sparkles size={14} color="#059669" />}
                              <strong>{pkg.package_name.split(':')[0]}</strong>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '220px' }}>
                              {pkg.description}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              {pkg.interventions.traffic > 0 && <span>🚗 Traffic: {pkg.interventions.traffic}%</span>}
                              {pkg.interventions.ev_fleet > 0 && <span>⚡ EV Fleet: {pkg.interventions.ev_fleet}%</span>}
                              {pkg.interventions.industrial > 0 && <span>🏭 Industrial: {pkg.interventions.industrial}%</span>}
                              {pkg.interventions.green_buffer > 0 && <span>🌿 Green Buffer: {pkg.interventions.green_buffer}%</span>}
                              {pkg.interventions.dust_misting && <span>💦 Dust Misting: ACTIVE</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                              ₹{pkg.cost_after_shock_lakh.toFixed(1)}L
                            </div>
                            {costShockPct !== 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Base: ₹{pkg.base_cost_lakh.toFixed(1)}L
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isFeasible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                color: isFeasible ? '#047857' : '#b91c1c',
                              }}
                            >
                              {pkg.feasibility_status}
                            </span>
                            {!isFeasible && pkg.infeasibility_reason && (
                              <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.2rem', maxWidth: '200px' }}>
                                {pkg.infeasibility_reason}
                              </div>
                            )}
                            {isFeasible && (
                              <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '0.2rem' }}>
                                Headroom: ₹{pkg.remaining_budget_lakh.toFixed(1)}L ({pkg.budget_utilization_pct}%)
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <div>
                              {formatNumber(pkg.modeled_baseline_pm25, 1)} →{' '}
                              <strong>{formatNumber(pkg.modeled_scenario_pm25, 1)} µg/m³</strong>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MODELED</div>
                          </td>
                          <td>
                            <div style={{ color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <TrendingDown size={14} />
                              <span>{formatNumber(pkg.modeled_delta_pm25, 2)} µg/m³</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              ({formatNumber(pkg.modeled_pct_change, 1)}%)
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => setExpandedBreakdownId(isExpanded ? null : pkg.package_id)}
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Cost Breakdown Sub-row */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={7} style={{ padding: '1rem 1.25rem' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Programmatic Cost Calculation Breakdown for {pkg.package_name}:
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                {pkg.cost_breakdown.map((item) => (
                                  <div
                                    key={item.intervention_id}
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      backgroundColor: '#ffffff',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-subtle)',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.calculation_formula}</div>
                                    <div style={{ marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Subtotal:</span>
                                      <strong>₹{item.subtotal_lakh.toFixed(2)}L</strong>
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                      Policy: {item.policy_mapping}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                  Total Calculated Expenditure: <strong>₹{pkg.cost_after_shock_lakh.toFixed(2)} Lakh</strong> | Budget Ceiling: ₹{pkg.municipal_budget_lakh.toFixed(2)} Lakh
                                </div>
                                <div>
                                  {pkg.is_feasible ? (
                                    <span style={{ color: '#047857', fontWeight: 600 }}>
                                      ✓ FEASIBLE — ₹{pkg.remaining_budget_lakh.toFixed(2)}L unallocated headroom available
                                    </span>
                                  ) : (
                                    <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                                      ✗ INFEASIBLE — {pkg.infeasibility_reason}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 6. Custom Municipal Package Builder */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: '0.4rem' }}>
          <div className="card-title">
            <Sliders size={18} color="var(--primary)" />
            <span>Interactive Municipal Portfolio Builder</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            onClick={() => handleToggleCustom(!customEnabled)}
          >
            {customEnabled ? '✓ Custom Portfolio Active' : '+ Build Custom Portfolio'}
          </button>
        </div>

        {customEnabled ? (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Configure specific municipal lever levels within official operational limits to evaluate an arbitrary intervention portfolio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Traffic */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem' }}>
                    <Car size={14} color="#ea580c" /> Traffic Rationing (Max 40%):
                  </label>
                  <strong style={{ color: customTraffic > 40 ? '#b91c1c' : '#ea580c' }}>{customTraffic}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={customTraffic}
                  onChange={(e) => setCustomTraffic(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                {customTraffic > 40 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    ⚠️ Operational limit exceeded by {(customTraffic - 40).toFixed(0)} percentage points (max 40%).
                  </div>
                )}
              </div>

              {/* EV Fleet */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem' }}>
                    <Zap size={14} color="#059669" /> EV Fleet Transition (Max 50%):
                  </label>
                  <strong style={{ color: customEvFleet > 50 ? '#b91c1c' : '#059669' }}>{customEvFleet}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="5"
                  value={customEvFleet}
                  onChange={(e) => setCustomEvFleet(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                {customEvFleet > 50 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    ⚠️ Operational limit exceeded by {(customEvFleet - 50).toFixed(0)} percentage points (max 50%).
                  </div>
                )}
              </div>

              {/* Industrial */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem' }}>
                    <Factory size={14} color="#ef4444" /> Industrial Curbs (Max 35%):
                  </label>
                  <strong style={{ color: customIndustrial > 35 ? '#b91c1c' : '#ef4444' }}>{customIndustrial}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={customIndustrial}
                  onChange={(e) => setCustomIndustrial(Number(e.target.value))}
                  disabled={industrialBlocked}
                  style={{ width: '100%' }}
                />
                {industrialBlocked && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    ⚠️ Lever currently unavailable due to legal dispute.
                  </div>
                )}
                {customIndustrial > 35 && !industrialBlocked && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    ⚠️ Operational limit exceeded by {(customIndustrial - 35).toFixed(0)} percentage points (max 35%).
                  </div>
                )}
              </div>

              {/* Green Buffer */}
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem' }}>
                    <Leaf size={14} color="#10b981" /> Green Buffer Belts (Max 30%):
                  </label>
                  <strong style={{ color: customGreenBuffer > 30 ? '#b91c1c' : '#10b981' }}>{customGreenBuffer}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="5"
                  value={customGreenBuffer}
                  onChange={(e) => setCustomGreenBuffer(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                {customGreenBuffer > 30 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    ⚠️ Operational limit exceeded by {(customGreenBuffer - 30).toFixed(0)} percentage points (max 30%).
                  </div>
                )}
              </div>
            </div>

            {/* Binary Misting Checkbox */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardHat size={16} color="#d97706" />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Construction Dust Misting Cannons (Binary Lever)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fixed deployment cost: ₹4.50 Lakh across metro and construction corridors.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={customDustMisting}
                onChange={(e) => setCustomDustMisting(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => fetchOptimization(budgetLakh, costShockPct, responseSensitivityPct, industrialBlocked, true)}
            >
              Recompute Evaluation with Custom Portfolio
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
            Click &ldquo;+ Build Custom Portfolio&rdquo; above to adjust individual levers and test custom budget combinations.
          </div>
        )}
      </div>

      {/* 7. Traceable Cost & Response Assumptions Collapsible Panel */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            paddingBottom: showAssumptions ? '0.75rem' : 0,
            borderBottom: showAssumptions ? '1px solid var(--border-subtle)' : 'none',
          }}
          onClick={() => setShowAssumptions(!showAssumptions)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Declared Cost Matrix & Response Assumptions</span>
            <span className="badge badge-scenario">Methodology & Governance</span>
          </div>
          <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
            {showAssumptions ? 'Collapse' : 'Inspect Assumptions'}
          </button>
        </div>

        {showAssumptions && (
          <div style={{ marginTop: '1rem' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Intervention Lever</th>
                    <th>Classification</th>
                    <th>Declared Unit Cost</th>
                    <th>Operational Ceiling</th>
                    <th>Municipal Policy Mapping</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data &&
                    Object.values(data.cost_matrix).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {item.id}</div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{item.classification.toUpperCase()}</td>
                        <td>
                          <strong>₹{item.unit_cost_lakh.toFixed(2)}L</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.unit_label}</div>
                        </td>
                        <td>
                          <strong style={{ color: '#ea580c' }}>
                            {item.classification === 'binary' ? 'Binary (1.0)' : `${item.operational_max}%`}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.75rem', maxWidth: '280px' }}>{item.policy_mapping}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: item.is_available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: item.is_available ? '#047857' : '#b91c1c',
                            }}
                          >
                            {item.is_available ? 'AVAILABLE' : 'BLOCKED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}
            >
              <strong>SCIENTIFIC & MODEL GOVERNANCE DISCLOSURE:</strong>
              <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: 0 }}>
                <li>
                  <strong>Cost Formula:</strong> Total Expenditure = ∑(Unit Costᵢ × Intervention Levelᵢ) + Fixed Overhead. Overhead default is set to ₹0.00L.
                </li>
                <li>
                  <strong>Model-Attributed vs Observed:</strong> All pollution reductions and air quality impacts are counterfactual ML model estimates, not observed physical measurements or guaranteed causal outcomes.
                </li>
                <li>
                  <strong>Pareto Optimality & Heuristics:</strong> Recommendations reflect the &ldquo;Best evaluated package&rdquo; according to the primary objective (maximizing modeled PM2.5 reduction within declared budget and operational bounds), not global mathematical optimality.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
