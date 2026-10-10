/**
 * What-If / Counterfactual Scenario Types
 * Matches backend/app/schemas/scenario.py
 */

export type InterventionType = 
  | 'TRAFFIC_REDUCTION'
  | 'INDUSTRIAL_ACTIVITY_REDUCTION'
  | 'COMBINED_INTERVENTION'
  | 'EV_FLEET_TRANSITION'
  | 'GREEN_BUFFER_EXPANSION'
  | 'COMPREHENSIVE_POLICY';

export interface InterventionParams {
  type: InterventionType;
  traffic_reduction_percent?: number | null;
  industrial_activity_reduction_percent?: number | null;
  ev_fleet_transition_percent?: number | null;
  green_buffer_increase_percent?: number | null;
  construction_dust_suppression?: boolean | null;
}

export interface FeatureAuditItem {
  feature_name: string;
  baseline_value: number;
  counterfactual_value: number;
  delta: number;
  transformation: string;
  classification: string;
}

export interface ScenarioCreateRequest {
  scenario_name: string;
  station_id: number;
  baseline_timestamp_utc: string;
  model_id?: string;
  intervention: InterventionParams;
  description?: string | null;
}

export interface ScenarioResponse {
  scenario_id: string;
  scenario_name: string;
  description?: string | null;
  station_id?: number | null;
  model_id: string;
  baseline_timestamp_utc?: string | null;
  traffic_reduction_pct: number;
  industrial_reduction_pct: number;
  construction_halt: boolean;
  simulation_status: string; // e.g. "DRAFT", "COMPLETED", "ERROR"
  is_modeled_scenario: boolean;
  created_by: string;
  created_at: string;
  intervention?: {
    type?: string;
    traffic_reduction_percent?: number;
    industrial_activity_reduction_percent?: number;
    [key: string]: unknown;
  } | null;
}

export interface ScenarioRunResponse {
  scenario_id: string;
  station_id: number;
  station_name: string;
  baseline_timestamp_utc: string;
  target_timestamp_utc: string;
  model_id: string;
  model_type: string;
  intervention: {
    type: string;
    traffic_reduction_percent?: number;
    industrial_activity_reduction_percent?: number;
    [key: string]: unknown;
  };
  baseline_prediction_pm25: number;
  counterfactual_prediction_pm25: number;
  absolute_change_pm25: number;
  estimated_reduction_pm25: number;
  percentage_change: number;
  unit: string;
  uncertainty_available: boolean;
  uncertainty_note: string;
  interpretation_note: string;
  data_classification: string;
  affected_features_audit: FeatureAuditItem[];
  created_at: string;
}

export interface ScenarioResultResponse {
  id: number;
  scenario_id: string;
  station_id: number;
  baseline_timestamp_utc?: string | null;
  target_time_utc: string;
  baseline_pm25: number;
  scenario_pm25: number;
  delta_pm25: number;
  pct_change: number;
  unit: string;
  uncertainty_available: boolean;
  interpretation_note: string;
  data_classification: string;
  metadata_json?: {
    affected_features_audit?: FeatureAuditItem[];
    [key: string]: unknown;
  } | null;
  created_at: string;
}

export interface ScenarioListResponse {
  total: number;
  limit: number;
  offset: number;
  items: ScenarioResponse[];
}

export interface ScenarioResultsListResponse {
  scenario_id: string;
  total: number;
  limit: number;
  offset: number;
  items: ScenarioResultResponse[];
}

// =========================================================================
// Policy & Budget Optimizer Types (Addition 1)
// =========================================================================

export interface InterventionCostSpec {
  id: string;
  name: string;
  classification: 'variable' | 'binary';
  unit_cost_lakh: number;
  unit_label: string;
  operational_max: number;
  policy_mapping: string;
  is_available: boolean;
  unavailability_reason?: string | null;
}

export interface CostBreakdownItem {
  intervention_id: string;
  name: string;
  level: number;
  level_display: string;
  unit_cost_lakh: number;
  effective_unit_cost_lakh: number;
  subtotal_lakh: number;
  calculation_formula: string;
  policy_mapping: string;
}

export interface PackageInterventions {
  traffic: number;
  ev_fleet: number;
  industrial: number;
  green_buffer: number;
  dust_misting: boolean;
}

export interface PackageEvaluation {
  package_id: string;
  package_name: string;
  description: string;
  interventions: PackageInterventions;
  cost_breakdown: CostBreakdownItem[];
  base_cost_lakh: number;
  cost_after_shock_lakh: number;
  fixed_overhead_lakh: number;
  municipal_budget_lakh: number;
  remaining_budget_lakh: number;
  budget_utilization_pct: number;
  is_feasible: boolean;
  feasibility_status: 'FEASIBLE' | 'INFEASIBLE';
  infeasibility_reason?: string | null;
  operational_constraints_satisfied: boolean;
  violated_constraints: string[];
  is_available: boolean;
  unavailability_reason?: string | null;
  modeled_baseline_pm25: number;
  modeled_scenario_pm25: number;
  modeled_delta_pm25: number;
  modeled_pct_change: number;
  modeled_co2e_reduction_pct: number;
  modeled_co2e_reduction_tonnes_month: number;
  affected_area_sq_km: number;
  is_recommended: boolean;
  data_classification: string;
}

export interface RecommendationSummary {
  status: 'FEASIBLE_OPTIMAL' | 'NO_FEASIBLE_PACKAGE';
  recommended_package_id?: string | null;
  recommended_package_name?: string | null;
  label: string;
  reason: string;
  modeled_pm25_reduction?: number | null;
  cost_lakh?: number | null;
  budget_remaining_lakh?: number | null;
}

export interface OptimizeRequest {
  budget_lakh: number;
  custom_interventions?: PackageInterventions | null;
  unavailable_interventions?: string[];
  cost_shock_pct?: number;
  response_sensitivity_pct?: number;
  fixed_overhead_lakh?: number;
  station_id?: number;
  model_id?: string;
  include_alternative_combinations?: boolean;
}

export interface OptimizeResponse {
  budget_lakh: number;
  cost_shock_pct: number;
  response_sensitivity_pct: number;
  fixed_overhead_lakh: number;
  cost_matrix: Record<string, InterventionCostSpec>;
  packages: PackageEvaluation[];
  recommendation: RecommendationSummary;
  primary_objective: string;
  methodology_note: string;
  created_at: string;
}
