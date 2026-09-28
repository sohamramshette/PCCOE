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
