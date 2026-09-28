import React, { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle2,
  Car,
  Factory,
  PlusCircle,
  ListFilter,
  Zap,
  Trees,
  HardHat,
  FileText,
  Sparkles,
} from 'lucide-react';
import { getStations } from '../api/stations';
import { createScenario, getScenarios, runScenario, getScenarioResults } from '../api/scenarios';
import { Station } from '../types/station';
import {
  InterventionType,
  ScenarioResponse,
  ScenarioRunResponse,
  ScenarioResultResponse,
} from '../types/scenario';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { ScenarioResultVisualization } from '../components/scenarios/ScenarioResultVisualization';
import { PolicyReportModal } from '../components/scenarios/PolicyReportModal';
import { formatNumber } from '../utils/formatters';

export const Scenarios: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [activeRunResult, setActiveRunResult] = useState<ScenarioRunResponse | null>(null);
  const [pastResults, setPastResults] = useState<ScenarioResultResponse[]>([]);

  // Form State
  const [scenarioName, setScenarioName] = useState<string>('Pune Clean Air Action Plan 2026');
  const [isCustomName, setIsCustomName] = useState<boolean>(false);
  const [stationId, setStationId] = useState<number>(11613);
  const [baselineTimestampUtc, setBaselineTimestampUtc] = useState<string>('2026-09-24T17:00:00Z');
  const [interventionType, setInterventionType] = useState<InterventionType>('COMPREHENSIVE_POLICY');
  const [trafficPercent, setTrafficPercent] = useState<number>(25);
  const [industrialPercent, setIndustrialPercent] = useState<number>(20);
  const [evFleetPercent, setEvFleetPercent] = useState<number>(35);
  const [greenBufferPercent, setGreenBufferPercent] = useState<number>(25);
  const [constructionDustSuppression, setConstructionDustSuppression] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('Multi-sector clean air initiative combining peak traffic rationing, industrial curb, 35% bus/fleet electrification, vegetative buffer belts, and strict construction misting.');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const applyPreset = (preset: 'pune_action_plan' | 'ev_transition' | 'green_buffer' | 'winter_emergency') => {
    setIsCustomName(true);
    if (preset === 'pune_action_plan') {
      setScenarioName('Pune Clean Air Action Plan 2026');
      setInterventionType('COMPREHENSIVE_POLICY');
      setTrafficPercent(25);
      setIndustrialPercent(20);
      setEvFleetPercent(35);
      setGreenBufferPercent(25);
      setConstructionDustSuppression(true);
      setDescription('Multi-sector clean air initiative combining peak traffic rationing, industrial curb, 35% bus/fleet electrification, vegetative buffer belts, and strict construction misting.');
    } else if (preset === 'ev_transition') {
      setScenarioName('50% Public & Commercial Fleet Electrification');
      setInterventionType('EV_FLEET_TRANSITION');
      setEvFleetPercent(50);
      setDescription('Accelerated electrification of PMPML transit buses, freight light commercial vehicles, and auto-rickshaws eliminating tailpipe combustion emissions.');
    } else if (preset === 'green_buffer') {
      setScenarioName('35% Urban Canopy & Green Buffer Expansion');
      setInterventionType('GREEN_BUFFER_EXPANSION');
      setGreenBufferPercent(35);
      setDescription('Establishing multi-tiered vegetative buffer zones along industrial boundaries and major highways to accelerate particulate dry deposition.');
    } else if (preset === 'winter_emergency') {
      setScenarioName('Severe Winter Stagnation Emergency Curbs');
      setInterventionType('COMBINED_INTERVENTION');
      setTrafficPercent(40);
      setIndustrialPercent(40);
      setConstructionDustSuppression(true);
      setDescription('Emergency Graded Response Action Plan (GRAP) curbing heavy vehicle movements, non-essential manufacturing, and halting construction dust.');
    }
  };

  const handleTrafficChange = (val: number) => {
    setTrafficPercent(val);
    if (!isCustomName) {
      if (interventionType === 'TRAFFIC_REDUCTION') {
        setScenarioName(`${val}% Traffic Reduction at Peak`);
      } else if (interventionType === 'COMBINED_INTERVENTION') {
        setScenarioName(`${val}% Traffic & ${industrialPercent}% Industrial Reduction`);
      }
    }
  };

  const handleIndustrialChange = (val: number) => {
    setIndustrialPercent(val);
    if (!isCustomName && interventionType === 'COMBINED_INTERVENTION') {
      setScenarioName(`${trafficPercent}% Traffic & ${val}% Industrial Reduction`);
    } else if (!isCustomName && interventionType === 'INDUSTRIAL_ACTIVITY_REDUCTION') {
      setScenarioName(`${val}% Industrial Curtailment`);
    }
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load initial data
  const loadScenariosAndStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stationList, scenarioList] = await Promise.all([
        getStations(true),
        getScenarios({ limit: 50 }),
      ]);
      setStations(stationList);
      setScenarios(scenarioList.items || []);

      if (stationList.length > 0 && !stationId) {
        setStationId(stationList[0].station_id);
      }
      if (scenarioList.items && scenarioList.items.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(scenarioList.items[0].scenario_id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenariosAndStations();
  }, []);

  // When a scenario is selected from the list, load its historical results
  useEffect(() => {
    if (!selectedScenarioId) return;

    let isCurrent = true;
    const fetchResults = async () => {
      try {
        const res = await getScenarioResults(selectedScenarioId);
        if (isCurrent) {
          setPastResults(res.items || []);
        }
      } catch (err) {
        console.error('Failed to load past results:', err);
      }
    };

    fetchResults();
    return () => {
      isCurrent = false;
    };
  }, [selectedScenarioId]);

  // Handle Scenario Creation
  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      setActionSuccess(null);

      const isTrafficActive =
        interventionType === 'TRAFFIC_REDUCTION' ||
        interventionType === 'COMBINED_INTERVENTION' ||
        interventionType === 'COMPREHENSIVE_POLICY';

      const isIndustrialActive =
        interventionType === 'INDUSTRIAL_ACTIVITY_REDUCTION' ||
        interventionType === 'COMBINED_INTERVENTION' ||
        interventionType === 'COMPREHENSIVE_POLICY';

      const isEvActive =
        interventionType === 'EV_FLEET_TRANSITION' ||
        interventionType === 'COMPREHENSIVE_POLICY';

      const isGreenActive =
        interventionType === 'GREEN_BUFFER_EXPANSION' ||
        interventionType === 'COMPREHENSIVE_POLICY';

      const isDustActive =
        interventionType === 'COMPREHENSIVE_POLICY' ? constructionDustSuppression : false;

      const payload = {
        scenario_name: scenarioName,
        station_id: stationId,
        baseline_timestamp_utc: baselineTimestampUtc,
        model_id: 'gradient_boosting_baseline',
        intervention: {
          type: interventionType,
          traffic_reduction_percent: isTrafficActive ? Number(trafficPercent) : undefined,
          industrial_activity_reduction_percent: isIndustrialActive ? Number(industrialPercent) : undefined,
          ev_fleet_transition_percent: isEvActive ? Number(evFleetPercent) : undefined,
          green_buffer_increase_percent: isGreenActive ? Number(greenBufferPercent) : undefined,
          construction_dust_suppression: isDustActive,
        },
        description,
      };

      const created = await createScenario(payload);
      setActionSuccess(`Scenario "${created.scenario_name}" created successfully.`);
      setSelectedScenarioId(created.scenario_id);

      // Refresh scenario list
      const updatedList = await getScenarios({ limit: 50 });
      setScenarios(updatedList.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario.');
    } finally {
      setCreating(false);
    }
  };

  // Handle Scenario Execution
  const handleRunActiveScenario = async () => {
    if (!selectedScenarioId) return;

    try {
      setRunning(true);
      setError(null);
      setActionSuccess(null);

      const runResult = await runScenario(selectedScenarioId);
      setActiveRunResult(runResult);
      setActionSuccess(`Simulation completed! Estimated PM2.5 change: ${formatNumber(runResult.absolute_change_pm25, 2)} µg/m³`);

      // Refresh past results for this scenario
      const res = await getScenarioResults(selectedScenarioId);
      setPastResults(res.items || []);

      // Refresh scenario list to show COMPLETED status
      const updatedList = await getScenarios({ limit: 50 });
      setScenarios(updatedList.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation run failed.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading What-If Scenario Engine..." />;
  }

  const selectedScenario = scenarios.find((s) => s.scenario_id === selectedScenarioId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span className="badge badge-scenario">Digital Twin Simulator</span>
          <span className="badge badge-observed">Counterfactual Engine</span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>What-If Policy Intervention Simulator</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '850px', marginTop: '0.2rem' }}>
          Evaluate hypothetical urban interventions (traffic congestion restrictions, industrial curtailment, or combined policies)
          against historical baseline conditions to forecast counterfactual air quality changes in Pune & PCMC.
        </p>
      </div>

      {actionSuccess && (
        <div
          className="toast toast-success"
          style={{ color: '#047857', fontSize: '0.85rem' }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && <ErrorDisplay message={error} onRetry={loadScenariosAndStations} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
        {/* Scenario Creation Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <PlusCircle size={18} color="var(--primary)" />
              <span>Configure Policy Intervention</span>
            </div>
            <span className="badge badge-proxy">Multi-Lever Studio</span>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
              Quick Policy Presets:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => applyPreset('pune_action_plan')}
              >
                <span>🌿 Clean Air Plan 2026</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => applyPreset('ev_transition')}
              >
                <Zap size={12} color="#059669" />
                <span>50% EV Transit Fleet</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => applyPreset('green_buffer')}
              >
                <Trees size={12} color="#10b981" />
                <span>35% Canopy Buffer</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => applyPreset('winter_emergency')}
              >
                <span>⚠️ Winter Smog Curbs</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateScenario}>
            <div className="form-group">
              <label className="form-label">Scenario Name</label>
              <input
                type="text"
                className="form-input"
                value={scenarioName}
                onChange={(e) => {
                  setScenarioName(e.target.value);
                  setIsCustomName(true);
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Target Station</label>
                <select
                  className="form-select"
                  value={stationId}
                  onChange={(e) => setStationId(Number(e.target.value))}
                >
                  {stations.map((st) => (
                    <option key={st.station_id} value={st.station_id}>
                      {st.station_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Baseline Hour (UTC)</label>
                <input
                  type="text"
                  className="form-input"
                  value={baselineTimestampUtc}
                  onChange={(e) => setBaselineTimestampUtc(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:00:00Z"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Intervention Policy Type</label>
              <select
                className="form-select"
                value={interventionType}
                onChange={(e) => {
                  const nextType = e.target.value as InterventionType;
                  setInterventionType(nextType);
                  if (!isCustomName) {
                    if (nextType === 'TRAFFIC_REDUCTION') setScenarioName(`${trafficPercent}% Traffic Reduction at Peak`);
                    else if (nextType === 'INDUSTRIAL_ACTIVITY_REDUCTION') setScenarioName(`${industrialPercent}% Industrial Curtailment`);
                    else if (nextType === 'EV_FLEET_TRANSITION') setScenarioName(`${evFleetPercent}% Fleet Electrification Mandate`);
                    else if (nextType === 'GREEN_BUFFER_EXPANSION') setScenarioName(`${greenBufferPercent}% Green Buffer Zone Expansion`);
                    else if (nextType === 'COMPREHENSIVE_POLICY') setScenarioName('Pune Integrated Clean Air Action Plan 2026');
                    else setScenarioName(`${trafficPercent}% Traffic & ${industrialPercent}% Industrial Reduction`);
                  }
                }}
              >
                <option value="COMPREHENSIVE_POLICY">Comprehensive Multi-Sector Clean Air Plan</option>
                <option value="EV_FLEET_TRANSITION">EV Fleet Transition (Tailpipe Mitigation)</option>
                <option value="GREEN_BUFFER_EXPANSION">Urban Green Buffer & Vegetative Canopy</option>
                <option value="TRAFFIC_REDUCTION">Traffic Congestion Reduction</option>
                <option value="INDUSTRIAL_ACTIVITY_REDUCTION">Industrial Activity Curtailment</option>
                <option value="COMBINED_INTERVENTION">Combined Traffic & Industrial Policy</option>
              </select>
            </div>

            {/* Traffic Slider */}
            {(interventionType === 'TRAFFIC_REDUCTION' || interventionType === 'COMBINED_INTERVENTION' || interventionType === 'COMPREHENSIVE_POLICY') && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Car size={15} color="#ea580c" /> Traffic Reduction:
                  </label>
                  <strong style={{ color: '#ea580c', fontSize: '0.95rem' }}>{trafficPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={trafficPercent}
                  onChange={(e) => handleTrafficChange(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Reduces diurnal traffic proxy and downstream stagnation interaction ratios.
                </div>
              </div>
            )}

            {/* Industrial Slider */}
            {(interventionType === 'INDUSTRIAL_ACTIVITY_REDUCTION' || interventionType === 'COMBINED_INTERVENTION' || interventionType === 'COMPREHENSIVE_POLICY') && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Factory size={15} color="#f87171" /> Industrial Activity Reduction:
                  </label>
                  <strong style={{ color: '#f87171', fontSize: '0.95rem' }}>{industrialPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={industrialPercent}
                  onChange={(e) => handleIndustrialChange(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Reduces active industrial unit density and dispersion ratios within 2 km buffer.
                </div>
              </div>
            )}

            {/* EV Fleet Transition Slider */}
            {(interventionType === 'EV_FLEET_TRANSITION' || interventionType === 'COMPREHENSIVE_POLICY') && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Zap size={15} color="#059669" /> EV Fleet Electrification Mandate:
                  </label>
                  <strong style={{ color: '#059669', fontSize: '0.95rem' }}>{evFleetPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={evFleetPercent}
                  onChange={(e) => setEvFleetPercent(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Eliminates up to 65% of vehicle-related combustion emissions (traffic stagnation ratios).
                </div>
              </div>
            )}

            {/* Urban Green Buffer Slider */}
            {(interventionType === 'GREEN_BUFFER_EXPANSION' || interventionType === 'COMPREHENSIVE_POLICY') && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Trees size={15} color="#10b981" /> Urban Green Buffer Zone Expansion:
                  </label>
                  <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{greenBufferPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={greenBufferPercent}
                  onChange={(e) => setGreenBufferPercent(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Expands vegetative canopy filtration and attenuates industrial particulate dispersion.
                </div>
              </div>
            )}

            {/* Construction Dust Suppression Checkbox */}
            {interventionType === 'COMPREHENSIVE_POLICY' && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HardHat size={16} color="#d97706" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enforce Construction Dust Suppression</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Mandates perimeter misting and wind screens (curbs 65% of fugitive dust elements).
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={constructionDustSuppression}
                  onChange={(e) => setConstructionDustSuppression(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Hypothesis / Policy Description</label>
              <textarea
                className="form-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>
              {creating ? 'Creating Scenario...' : 'Create What-If Scenario'}
            </button>
          </form>
        </div>

        {/* Existing Scenarios & Execution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">
              <ListFilter size={18} color="var(--accent)" />
              <span>Registered Scenarios ({scenarios.length})</span>
            </div>
            <span className="badge badge-scenario">Persisted</span>
          </div>

          <div className="table-container" style={{ maxHeight: '250px', marginBottom: '1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Intervention</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc) => (
                  <tr
                    key={sc.scenario_id}
                    style={{
                      backgroundColor: sc.scenario_id === selectedScenarioId ? 'rgba(37, 99, 235, 0.06)' : 'inherit',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedScenarioId(sc.scenario_id);
                      setActiveRunResult(null);
                    }}
                  >
                    <td>
                      <strong>{sc.scenario_name}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sc.scenario_id}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {sc.traffic_reduction_pct > 0 && `Traffic: -${sc.traffic_reduction_pct}% `}
                      {sc.industrial_reduction_pct > 0 && `Ind: -${sc.industrial_reduction_pct}%`}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor:
                            sc.simulation_status === 'COMPLETED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color: sc.simulation_status === 'COMPLETED' ? '#047857' : '#b45309',
                          fontWeight: 600,
                        }}
                      >
                        {sc.simulation_status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScenarioId(sc.scenario_id);
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedScenario ? (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {selectedScenario.scenario_name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {selectedScenario.description || 'No description provided.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <div>Target Station: <strong>{stations.find((s) => s.station_id === selectedScenario.station_id)?.station_name ?? selectedScenario.station_id ?? 'Network'}</strong></div>
                  <div>Status: <strong>{selectedScenario.simulation_status}</strong></div>
                  <div>Traffic: <strong>{selectedScenario.traffic_reduction_pct}%</strong></div>
                  <div>Industrial: <strong>{selectedScenario.industrial_reduction_pct}%</strong></div>
                  {(selectedScenario.intervention as any)?.ev_fleet_transition_percent && (
                    <div>EV Fleet: <strong>{(selectedScenario.intervention as any).ev_fleet_transition_percent}%</strong></div>
                  )}
                  {(selectedScenario.intervention as any)?.green_buffer_increase_percent && (
                    <div>Green Buffer: <strong>{(selectedScenario.intervention as any).green_buffer_increase_percent}%</strong></div>
                  )}
                  {(selectedScenario.intervention as any)?.construction_dust_suppression && (
                    <div>Dust Screen: <strong>Enforced</strong></div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={handleRunActiveScenario}
                  className="btn btn-primary"
                  style={{ width: '100%', gap: '0.5rem' }}
                  disabled={running}
                >
                  <Play size={16} />
                  <span>{running ? 'Simulating Counterfactual Model Output...' : 'Execute Counterfactual Simulation'}</span>
                </button>

                {(selectedScenario.simulation_status === 'COMPLETED' || pastResults.length > 0 || activeRunResult) && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      gap: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: 'rgba(99, 102, 241, 0.4)',
                      color: '#4f46e5',
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={16} />
                    <span>Generate AI Policy Decision Brief</span>
                    <Sparkles size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="state-container">Select a scenario to inspect or run.</div>
          )}
        </div>
      </div>

      {/* Simulation Results Display (Active Run, Latest Past Result, or Empty State) */}
      <ScenarioResultVisualization
        scenario={selectedScenario || null}
        activeResult={activeRunResult}
        pastResults={pastResults}
        running={running}
        stationName={
          stations.find((s) => s.station_id === selectedScenario?.station_id)?.station_name ??
          `Station ${selectedScenario?.station_id || 'Network'}`
        }
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* AI Executive Policy Action Decision Brief Modal */}
      <PolicyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        scenarioId={selectedScenarioId || ''}
        scenarioName={selectedScenario?.scenario_name || 'Policy Scenario'}
      />
    </div>
  );
};
