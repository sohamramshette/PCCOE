/**
 * Urban Environmental Digital Twin - AI / LLM Explanation Types
 * Matches backend/app/schemas/llm.py
 */

export interface ForecastExplanation {
  station_id: number;
  station_name: string;
  prediction_time_utc: string;
  target_time_utc: string;
  predicted_pm25: number;
  aqi_category: string;
  executive_summary: string;
  atmospheric_drivers: string[];
  health_advisory: string;
  recommended_actions: string[];
  epistemological_note: string;
  generated_at: string;
}

export interface ScenarioExplanation {
  scenario_id: string;
  scenario_name: string;
  station_id: number;
  station_name: string;
  baseline_pm25: number;
  counterfactual_pm25: number;
  delta_pm25: number;
  percent_change: number;
  intervention_summary: string;
  executive_summary: string;
  mechanism_explanation: string;
  policy_effectiveness: 'HIGH' | 'MODERATE' | 'LOW' | 'CONDITIONAL' | string;
  municipal_recommendations: string[];
  epistemological_note: string;
  generated_at: string;
}

export interface PolicyActionItem {
  phase: string;
  action: string;
  responsible_agency: string;
  target_metric: string;
}

export interface PolicyReportResponse {
  report_title: string;
  verdict: 'HIGHLY_RECOMMENDED' | 'FEASIBLE_WITH_TARGETING' | 'MODERATE_IMPACT' | 'LOW_RETURN' | string;
  executive_summary: string;
  health_benefit_projection: string;
  economic_and_feasibility_analysis: string;
  action_plan: PolicyActionItem[];
  markdown_content: string;
}
