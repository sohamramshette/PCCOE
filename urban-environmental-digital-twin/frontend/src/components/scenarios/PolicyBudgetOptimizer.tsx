import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  ShieldAlert,
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
  Check,
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

  // Helper for lever pills
  const renderLeverPills = (interventions: PackageInterventions) => (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {interventions.traffic > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(234, 88, 12, 0.15)',
            color: '#fb923c',
            border: '1px solid rgba(234, 88, 12, 0.3)',
          }}
        >
          <Car size={11} /> {interventions.traffic}% Traffic
        </span>
      )}
      {interventions.ev_fleet > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <Zap size={11} /> {interventions.ev_fleet}% EV Bus
        </span>
      )}
      {interventions.industrial > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Factory size={11} /> {interventions.industrial}% Industrial
        </span>
      )}
      {interventions.green_buffer > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(52, 211, 153, 0.15)',
            color: '#6ee7b7',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          }}
        >
          <Leaf size={11} /> {interventions.green_buffer}% Buffer
        </span>
      )}
      {interventions.dust_misting && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          <HardHat size={11} /> Dust Misting
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header & Context Card */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.16)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 8px 24px rgba(22, 38, 25, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-scenario">Municipal Decision Support</span>
              <span className="badge badge-observed">Pune Clean Air Action Plan</span>
              <span className="badge" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)', fontWeight: 600 }}>
                Objective: Maximize PM2.5 Reduction
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: '#0d1710' }}>
              Policy &amp; Budget Optimizer
            </h2>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(241, 245, 249, 0.85)',
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(40, 122, 69, 0.18)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>Target Monitor:</span>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>{stationName.split(',')[0]}</span>
          </div>
        </div>

        {/* Visual Workflow Steps (Timeline Pipeline) */}
        <div
          style={{
            marginTop: '1rem',
            padding: '0.6rem 0.85rem',
            backgroundColor: 'rgba(241, 245, 249, 0.9)',
            borderRadius: '10px',
            border: '1px solid rgba(40, 122, 69, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            overflowX: 'auto',
          }}
        >
          {[
            { step: '1', label: 'Budget Ceiling', icon: <IndianRupee size={12} /> },
            { step: '2', label: 'Interventions', icon: <Sliders size={12} /> },
            { step: '3', label: 'Operational Caps', icon: <ShieldAlert size={12} /> },
            { step: '4', label: 'ML Prediction', icon: <Layers size={12} /> },
            { step: '5', label: 'Feasibility Rank', icon: <Sparkles size={12} /> },
            { step: '6', label: 'Stress Testing', icon: <RefreshCw size={12} /> },
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              {idx > 0 && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>→</span>}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(40, 122, 69, 0.16)',
                  color: '#1f2937',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                }}
              >
                <span style={{ color: '#166534', fontWeight: 700 }}>{item.step}.</span>
                <span>{item.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="toast toast-error" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Interactive Budget & Policy Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem' }}>
        {/* Budget Ceiling Slider Card */}
        <div
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(40, 122, 69, 0.16)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 6px 20px rgba(22, 38, 25, 0.04)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '0.6rem', borderBottom: 'none' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d1710' }}>
              <IndianRupee size={18} color="#166534" />
              <span>Municipal Budget Ceiling</span>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(40, 122, 69, 0.12)',
                color: '#166534',
                border: '1px solid rgba(40, 122, 69, 0.3)',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0.25rem 0.65rem',
              }}
            >
              ₹{budgetLakh.toFixed(1)} Lakh
            </span>
          </div>

          {/* Visual Budget Meter Track */}
          <div style={{ margin: '0.5rem 0 1rem 0' }}>
            <div
              style={{
                height: '8px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(5, (budgetLakh / 200) * 100))}%`,
                  background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>

            <input
              id="budget-slider-input"
              type="range"
              min="10"
              max="200"
              step="1"
              value={budgetLakh}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#34d399' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
              <span>₹10L (Austerity)</span>
              <span>₹50L (Baseline)</span>
              <span>₹200L (Max Cap)</span>
            </div>
          </div>

          {/* Budget Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {[
              { label: '₹30L Constrained', val: 30 },
              { label: '₹50L Default', val: 50 },
              { label: '₹75L Expanded', val: 75 },
              { label: '₹100L Priority', val: 100 },
              { label: '₹175L Full Cap', val: 175 },
            ].map((b) => {
              const active = budgetLakh === b.val;
              return (
                <button
                  key={b.val}
                  id={`budget-preset-${b.val}`}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.74rem',
                    fontWeight: active ? 700 : 600,
                    borderRadius: '8px',
                    backgroundColor: active ? 'rgba(40, 122, 69, 0.14)' : '#ffffff',
                    border: `1px solid ${active ? '#166534' : 'rgba(40, 122, 69, 0.2)'}`,
                    color: active ? '#166534' : '#334155',
                    boxShadow: active ? '0 2px 6px rgba(40, 122, 69, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleBudgetChange(b.val)}
                >
                  {b.label}
                </button>
              );
            })}
          </div>

          {lastBudgetChange && (
            <div style={{ fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Recomputed dynamically for ₹{budgetLakh.toFixed(1)}L.</span>
            </div>
          )}
        </div>

        {/* Operational Limits & Availability Card */}
        <div
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(40, 122, 69, 0.16)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 6px 20px rgba(22, 38, 25, 0.04)',
          }}
        >
          <div className="card-header" style={{ paddingBottom: '0.6rem', borderBottom: 'none' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d1710' }}>
              <ShieldAlert size={18} color="#dc2626" />
              <span>Operational Limits &amp; Levers</span>
            </div>
            <span className="badge badge-scenario">Admin Governance</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
            {/* Legal Dispute Toggle Card */}
            <div
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: '10px',
                backgroundColor: industrialBlocked ? '#fef2f2' : '#ffffff',
                border: `1px solid ${industrialBlocked ? 'rgba(239, 68, 68, 0.35)' : 'rgba(40, 122, 69, 0.16)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
              }}
              onClick={() => handleToggleIndustrialBlocked(!industrialBlocked)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    padding: '0.35rem',
                    borderRadius: '8px',
                    background: industrialBlocked ? '#fee2e2' : 'rgba(40, 122, 69, 0.08)',
                    color: industrialBlocked ? '#dc2626' : '#166534',
                  }}
                >
                  <Factory size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1710' }}>
                    Industrial Injunction Constraint
                  </div>
                  <div style={{ fontSize: '0.72rem', color: industrialBlocked ? '#b91c1c' : '#64748b', fontWeight: 500 }}>
                    {industrialBlocked ? 'Stay order active — industrial levers blocked' : 'All industrial levers available'}
                  </div>
                </div>
              </div>
              <input
                id="toggle-industrial-blocked"
                type="checkbox"
                checked={industrialBlocked}
                onChange={(e) => handleToggleIndustrialBlocked(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#dc2626' }}
              />
            </div>

            {/* Combinatorial Search Toggle Card */}
            <div
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: '10px',
                backgroundColor: includeAlternatives ? '#f0f9ff' : '#ffffff',
                border: `1px solid ${includeAlternatives ? 'rgba(2, 132, 199, 0.35)' : 'rgba(40, 122, 69, 0.16)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
              }}
              onClick={() => handleToggleAlternatives(!includeAlternatives)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    padding: '0.35rem',
                    borderRadius: '8px',
                    background: includeAlternatives ? '#e0f2fe' : 'rgba(40, 122, 69, 0.08)',
                    color: includeAlternatives ? '#0284c7' : '#166534',
                  }}
                >
                  <Layers size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d1710' }}>
                    Combinatorial Search (3+ Sectors)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: includeAlternatives ? '#0369a1' : '#64748b', fontWeight: 500 }}>
                    Auto-evaluates feasible multi-sector permutations
                  </div>
                </div>
              </div>
              <input
                id="toggle-combinatorial-search"
                type="checkbox"
                checked={includeAlternatives}
                onChange={(e) => handleToggleAlternatives(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284c7' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sensitivity Analysis / Stress Testing Card */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.16)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 6px 20px rgba(22, 38, 25, 0.04)',
        }}
      >
        <div className="card-header" style={{ paddingBottom: '0.6rem', borderBottom: 'none' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d1710' }}>
            <Sliders size={18} color="#d97706" />
            <span>Sensitivity Stress Testing</span>
          </div>
          <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
            Real-Time Shock Analysis
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
          {/* Dimension A: Cost Shock */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'rgba(241, 245, 249, 0.85)',
              borderRadius: '12px',
              border: '1px solid rgba(40, 122, 69, 0.16)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710' }}>Implementation Cost Shock:</span>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  backgroundColor: costShockPct > 0 ? '#fee2e2' : costShockPct < 0 ? '#dcfce7' : '#ffffff',
                  color: costShockPct > 0 ? '#b91c1c' : costShockPct < 0 ? '#15803d' : '#334155',
                  border: `1px solid ${costShockPct > 0 ? 'rgba(220, 38, 38, 0.25)' : costShockPct < 0 ? 'rgba(22, 101, 52, 0.25)' : 'rgba(40, 122, 69, 0.18)'}`,
                }}
              >
                {costShockPct > 0 ? `+${costShockPct}% Inflation` : costShockPct < 0 ? `${costShockPct}% Subsidy` : '0% Baseline'}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="5"
              value={costShockPct}
              onChange={(e) => handleCostShockChange(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#d97706' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
              <span>-20% (Subsidized)</span>
              <span>0%</span>
              <span>+20% (Cost Inflation)</span>
            </div>
          </div>

          {/* Dimension B: Response Sensitivity */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'rgba(241, 245, 249, 0.85)',
              borderRadius: '12px',
              border: '1px solid rgba(40, 122, 69, 0.16)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d1710' }}>Behavioral Response Adjustment:</span>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  backgroundColor: responseSensitivityPct < 0 ? '#fee2e2' : responseSensitivityPct > 0 ? '#dcfce7' : '#ffffff',
                  color: responseSensitivityPct < 0 ? '#b91c1c' : responseSensitivityPct > 0 ? '#15803d' : '#334155',
                  border: `1px solid ${responseSensitivityPct < 0 ? 'rgba(220, 38, 38, 0.25)' : responseSensitivityPct > 0 ? 'rgba(22, 101, 52, 0.25)' : 'rgba(40, 122, 69, 0.18)'}`,
                }}
              >
                {responseSensitivityPct > 0 ? `+${responseSensitivityPct}% Synergistic` : responseSensitivityPct < 0 ? `${responseSensitivityPct}% Rebound` : '0% Standard'}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={responseSensitivityPct}
              onChange={(e) => handleSensitivityChange(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#16a34a' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
              <span>-30% (Rebound Detour)</span>
              <span>0%</span>
              <span>+30% (Strict Compliance)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Best Evaluated Feasible Package Visual Hero Card */}
      {data && (
        <div
          className="card"
          style={{
            background: data.recommendation.status === 'FEASIBLE_OPTIMAL'
              ? 'rgba(240, 253, 244, 0.95)'
              : 'rgba(254, 252, 232, 0.95)',
            border: `1.5px solid ${data.recommendation.status === 'FEASIBLE_OPTIMAL' ? 'rgba(22, 101, 52, 0.35)' : 'rgba(217, 119, 6, 0.35)'}`,
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 8px 24px rgba(22, 38, 25, 0.05)',
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {data.recommendation.status === 'FEASIBLE_OPTIMAL' ? (
                <div style={{ padding: '0.45rem', borderRadius: '10px', background: '#dcfce7', color: '#15803d' }}>
                  <Sparkles size={20} />
                </div>
              ) : (
                <div style={{ padding: '0.45rem', borderRadius: '10px', background: '#fef3c7', color: '#b45309' }}>
                  <AlertTriangle size={20} />
                </div>
              )}
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? '#15803d' : '#b45309',
                  }}
                >
                  {data.recommendation.status === 'FEASIBLE_OPTIMAL' ? 'RECOMMENDED OPTIMAL PORTFOLIO' : 'CONSTRAINED TARGET'}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.1rem 0 0 0', color: '#0d1710' }}>
                  {data.recommendation.recommended_package_name || 'No Feasible Package Within Declared Budget'}
                </h3>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? '#dcfce7' : '#fef3c7',
                color: data.recommendation.status === 'FEASIBLE_OPTIMAL' ? '#15803d' : '#b45309',
                border: `1px solid ${data.recommendation.status === 'FEASIBLE_OPTIMAL' ? 'rgba(22, 101, 52, 0.3)' : 'rgba(180, 83, 9, 0.3)'}`,
              }}
            >
              {data.recommendation.status === 'FEASIBLE_OPTIMAL' ? <Check size={14} /> : <AlertTriangle size={14} />}
              <span>{data.recommendation.status === 'FEASIBLE_OPTIMAL' ? 'Fully Budget-Feasible' : 'Requires Budget Adjustment'}</span>
            </span>
          </div>

          {/* Visual KPI Cards Grid */}
          {recommendedPackage ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              {/* PM2.5 Drop Tile */}
              <div
                style={{
                  padding: '0.9rem',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(40, 122, 69, 0.16)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem', fontWeight: 600 }}>Modeled PM2.5 Drop</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '1.45rem', color: '#15803d', fontWeight: 800 }}>
                    {formatNumber(recommendedPackage.modeled_delta_pm25, 2)}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>µg/m³</span>
                  <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>({formatNumber(recommendedPackage.modeled_pct_change, 1)}%)</span>
                </div>
              </div>

              {/* Expenditure Tile with Progress Bar */}
              <div
                style={{
                  padding: '0.9rem',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(40, 122, 69, 0.16)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem', fontWeight: 600 }}>
                  <span>Expenditure</span>
                  <span>{recommendedPackage.budget_utilization_pct}% of Ceiling</span>
                </div>
                <strong style={{ fontSize: '1.35rem', color: '#0d1710', fontWeight: 800 }}>
                  ₹{recommendedPackage.cost_after_shock_lakh.toFixed(1)}L
                </strong>
                <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(0, 0, 0, 0.08)', marginTop: '0.4rem', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, recommendedPackage.budget_utilization_pct)}%`,
                      backgroundColor: '#16a34a',
                    }}
                  />
                </div>
              </div>

              {/* Headroom Tile */}
              <div
                style={{
                  padding: '0.9rem',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(40, 122, 69, 0.16)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem', fontWeight: 600 }}>Unallocated Headroom</div>
                <strong style={{ fontSize: '1.35rem', color: '#15803d', fontWeight: 800 }}>
                  ₹{recommendedPackage.remaining_budget_lakh.toFixed(1)}L
                </strong>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>Available reserve margin</div>
              </div>

              {/* Active Levers Tile */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(12, 22, 14, 0.7)',
                  border: '1px solid rgba(163, 181, 147, 0.18)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'rgba(238, 241, 231, 0.55)', marginBottom: '0.4rem' }}>Deployed Interventions</div>
                {renderLeverPills(recommendedPackage.interventions)}
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontSize: '0.82rem' }}>
              {data.recommendation.reason}
            </div>
          )}
        </div>
      )}

      {/* 5. Package Comparison Table (Visual & Scannable) */}
      <div
        id="portfolio-comparison-table"
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 8px 24px rgba(22, 38, 25, 0.04)',
        }}
      >
        <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: 'none' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d1710' }}>
            <Layers size={18} color="#166534" />
            <span>Demonstration Portfolio Comparison</span>
          </div>
          <span className="badge badge-scenario">Dynamic Evaluation</span>
        </div>

        {loading && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
            Evaluating portfolio permutations against model baseline...
          </div>
        )}

        {data && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Portfolio</th>
                  <th>Composition Levers</th>
                  <th>Expenditure</th>
                  <th>Budget Status</th>
                  <th>Modeled PM2.5</th>
                  <th>Net Reduction</th>
                  <th style={{ textAlign: 'right' }}>Breakdown</th>
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
                          backgroundColor: pkg.is_recommended
                            ? 'rgba(34, 197, 94, 0.08)'
                            : isFeasible
                            ? 'transparent'
                            : 'rgba(239, 68, 68, 0.04)',
                        }}
                      >
                        {/* Portfolio Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {pkg.is_recommended && <Sparkles size={14} color="#16a34a" />}
                            <strong style={{ color: pkg.is_recommended ? '#15803d' : '#0d1710' }}>
                              {pkg.package_name.split(':')[0]}
                            </strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                            {pkg.package_name.includes(':') ? pkg.package_name.split(':')[1].trim() : ''}
                          </div>
                        </td>

                        {/* Composition Levers Visual Pills */}
                        <td>
                          {renderLeverPills(pkg.interventions)}
                        </td>

                        {/* Calculated Expenditure */}
                        <td>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710' }}>
                            ₹{pkg.cost_after_shock_lakh.toFixed(1)}L
                          </div>
                          {costShockPct !== 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Base: ₹{pkg.base_cost_lakh.toFixed(1)}L
                            </div>
                          )}
                        </td>

                        {/* Budget Status with Visual Progress Bar */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isFeasible ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                color: isFeasible ? '#15803d' : '#b91c1c',
                                border: `1px solid ${isFeasible ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              }}
                            >
                              {isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: isFeasible ? '#15803d' : '#b91c1c', marginTop: '0.25rem', fontWeight: 600 }}>
                            {isFeasible ? `₹${pkg.remaining_budget_lakh.toFixed(1)}L Headroom` : `Over by ₹${(pkg.cost_after_shock_lakh - pkg.municipal_budget_lakh).toFixed(1)}L`}
                          </div>
                        </td>

                        {/* Modeled PM2.5 */}
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {formatNumber(pkg.modeled_baseline_pm25, 1)} → <strong style={{ color: '#0d1710' }}>{formatNumber(pkg.modeled_scenario_pm25, 1)}</strong>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>µg/m³ (Modeled)</div>
                        </td>

                        {/* Attributed Reduction */}
                        <td>
                          <div style={{ color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.88rem' }}>
                            <TrendingDown size={14} />
                            <span>{formatNumber(pkg.modeled_delta_pm25, 2)} µg/m³</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
                            ({formatNumber(pkg.modeled_pct_change, 1)}%)
                          </div>
                        </td>

                        {/* Breakdown Button */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              borderRadius: '6px',
                              backgroundColor: isExpanded ? 'rgba(40, 122, 69, 0.15)' : '#ffffff',
                              borderColor: isExpanded ? '#166534' : 'rgba(40, 122, 69, 0.25)',
                              color: isExpanded ? '#166534' : '#334155',
                              fontWeight: 600,
                            }}
                            onClick={() => setExpandedBreakdownId(isExpanded ? null : pkg.package_id)}
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Cost Breakdown Sub-row (Frosted Glass Theme) */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'rgba(240, 248, 242, 0.65)' }}>
                          <td colSpan={7} style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.65rem' }}>
                              Cost Calculation Breakdown: {pkg.package_name}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '0.75rem' }}>
                              {pkg.cost_breakdown.map((item) => (
                                <div
                                  key={item.intervention_id}
                                  style={{
                                    padding: '0.55rem 0.75rem',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(40, 122, 69, 0.18)',
                                    fontSize: '0.75rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                  }}
                                >
                                  <div style={{ fontWeight: 700, color: '#0d1710' }}>{item.name}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.68rem', margin: '0.15rem 0' }}>{item.calculation_formula}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>Subtotal:</span>
                                    <strong style={{ color: '#15803d', fontSize: '0.82rem' }}>₹{item.subtotal_lakh.toFixed(2)}L</strong>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid rgba(40, 122, 69, 0.16)',
                                paddingTop: '0.6rem',
                                fontSize: '0.78rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ color: '#334155' }}>
                                Total Expenditure: <strong style={{ color: '#0d1710' }}>₹{pkg.cost_after_shock_lakh.toFixed(2)}L</strong> / Budget Ceiling: <strong style={{ color: '#0d1710' }}>₹{pkg.municipal_budget_lakh.toFixed(2)}L</strong>
                              </div>
                              <div>
                                {pkg.is_feasible ? (
                                  <span style={{ color: '#15803d', fontWeight: 700 }}>
                                    ✓ FEASIBLE — ₹{pkg.remaining_budget_lakh.toFixed(2)}L Headroom
                                  </span>
                                ) : (
                                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>
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
        )}
      </div>

      {/* 6. Custom Municipal Package Builder */}
      <div
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 8px 24px rgba(22, 38, 25, 0.04)',
        }}
      >
        <div className="card-header" style={{ paddingBottom: '0.5rem', borderBottom: 'none' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d1710' }}>
            <Sliders size={18} color="#166534" />
            <span>Custom Portfolio Builder</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: '0.75rem',
              padding: '0.3rem 0.7rem',
              borderRadius: '8px',
              backgroundColor: customEnabled ? 'rgba(34, 197, 94, 0.15)' : '#ffffff',
              borderColor: customEnabled ? '#166534' : 'rgba(40, 122, 69, 0.25)',
              color: customEnabled ? '#15803d' : '#334155',
              fontWeight: 650,
            }}
            onClick={() => handleToggleCustom(!customEnabled)}
          >
            {customEnabled ? '✓ Custom Mode Active' : '+ Build Custom Portfolio'}
          </button>
        </div>

        {customEnabled && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              {/* Traffic */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(240, 248, 242, 0.75)', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem', color: '#0d1710', fontWeight: 600 }}>
                    <Car size={14} color="#ea580c" /> Traffic Rationing (Max 40%):
                  </label>
                  <strong style={{ color: customTraffic > 40 ? '#dc2626' : '#ea580c' }}>{customTraffic}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={customTraffic}
                  onChange={(e) => setCustomTraffic(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ea580c' }}
                />
                {customTraffic > 40 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} color="#b91c1c" />
                    <span>Operational limit exceeded by {(customTraffic - 40).toFixed(0)} percentage points (max 40%).</span>
                  </div>
                )}
              </div>

              {/* EV Fleet */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(240, 248, 242, 0.75)', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem', color: '#0d1710', fontWeight: 600 }}>
                    <Zap size={14} color="#16a34a" /> EV Fleet Transition (Max 50%):
                  </label>
                  <strong style={{ color: customEvFleet > 50 ? '#dc2626' : '#15803d' }}>{customEvFleet}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="5"
                  value={customEvFleet}
                  onChange={(e) => setCustomEvFleet(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#16a34a' }}
                />
                {customEvFleet > 50 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} color="#b91c1c" />
                    <span>Operational limit exceeded by {(customEvFleet - 50).toFixed(0)} percentage points (max 50%).</span>
                  </div>
                )}
              </div>

              {/* Industrial */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(240, 248, 242, 0.75)', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem', color: '#0d1710', fontWeight: 600 }}>
                    <Factory size={14} color="#dc2626" /> Industrial Curbs (Max 35%):
                  </label>
                  <strong style={{ color: customIndustrial > 35 ? '#dc2626' : '#dc2626' }}>{customIndustrial}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={customIndustrial}
                  onChange={(e) => setCustomIndustrial(Number(e.target.value))}
                  disabled={industrialBlocked}
                  style={{ width: '100%', accentColor: '#dc2626' }}
                />
                {industrialBlocked && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} color="#b91c1c" />
                    <span>Lever currently unavailable due to legal dispute.</span>
                  </div>
                )}
                {customIndustrial > 35 && !industrialBlocked && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} color="#b91c1c" />
                    <span>Operational limit exceeded by {(customIndustrial - 35).toFixed(0)} percentage points (max 35%).</span>
                  </div>
                )}
              </div>

              {/* Green Buffer */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(240, 248, 242, 0.75)', borderRadius: '10px', border: '1px solid rgba(40, 122, 69, 0.16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0, fontSize: '0.78rem', color: '#0d1710', fontWeight: 600 }}>
                    <Leaf size={14} color="#16a34a" /> Green Buffer Belts (Max 30%):
                  </label>
                  <strong style={{ color: customGreenBuffer > 30 ? '#dc2626' : '#15803d' }}>{customGreenBuffer}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="5"
                  value={customGreenBuffer}
                  onChange={(e) => setCustomGreenBuffer(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#16a34a' }}
                />
                {customGreenBuffer > 30 && (
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} color="#b91c1c" />
                    <span>Operational limit exceeded by {(customGreenBuffer - 30).toFixed(0)} percentage points (max 30%).</span>
                  </div>
                )}
              </div>
            </div>

            {/* Binary Misting Checkbox */}
            <div
              style={{
                padding: '0.75rem 0.85rem',
                backgroundColor: 'rgba(240, 248, 242, 0.75)',
                borderRadius: '10px',
                border: '1px solid rgba(40, 122, 69, 0.16)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardHat size={16} color="#0284c7" />
                <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#0d1710' }}>
                  Dust Misting Cannons (Fixed: ₹4.50L)
                </span>
              </div>
              <input
                type="checkbox"
                checked={customDustMisting}
                onChange={(e) => setCustomDustMisting(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem', fontWeight: 700, fontSize: '0.88rem' }}
              onClick={() => fetchOptimization(budgetLakh, costShockPct, responseSensitivityPct, industrialBlocked, true)}
            >
              Evaluate Custom Portfolio
            </button>
          </div>
        )}
      </div>

      {/* 7. Traceable Cost Matrix & Governance (Collapsible) */}
      <div
        id="stress-testing-section"
        className="card"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(40, 122, 69, 0.18)',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          boxShadow: '0 8px 24px rgba(22, 38, 25, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowAssumptions(!showAssumptions)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={18} color="#166534" />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0d1710' }}>Cost Matrix &amp; Unit Rates</span>
            <span className="badge badge-scenario">Governance Specs</span>
          </div>
          <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', backgroundColor: '#ffffff', borderColor: 'rgba(40, 122, 69, 0.25)', color: '#334155', fontWeight: 600 }}>
            {showAssumptions ? 'Collapse' : 'Inspect'}
          </button>
        </div>

        {showAssumptions && (
          <div style={{ marginTop: '0.85rem' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Intervention Lever</th>
                    <th>Classification</th>
                    <th>Unit Cost</th>
                    <th>Operational Ceiling</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data &&
                    Object.values(data.cost_matrix).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong style={{ color: '#0d1710' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>ID: {item.id}</div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{item.classification.toUpperCase()}</td>
                        <td>
                          <strong style={{ color: '#15803d' }}>₹{item.unit_cost_lakh.toFixed(2)}L</strong>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.unit_label}</div>
                        </td>
                        <td>
                          <strong style={{ color: '#c2410c' }}>
                            {item.classification === 'binary' ? 'Binary (1.0)' : `${item.operational_max}%`}
                          </strong>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: item.is_available ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                              color: item.is_available ? '#15803d' : '#b91c1c',
                              border: `1px solid ${item.is_available ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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
          </div>
        )}
      </div>
    </div>
  );
};
