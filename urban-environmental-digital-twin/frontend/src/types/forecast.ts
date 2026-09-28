/**
 * Forecast Serving Types
 * Matches backend/app/schemas/forecast.py
 */

export interface InputFeaturesSummary {
  pm25_t?: number | null;
  temp_c?: number | null;
  wind_speed_ms?: number | null;
  ventilation_index?: number | null;
  traffic_proxy_index?: number | null;
  [key: string]: number | string | null | undefined;
}

export interface FeatureAttribution {
  feature: string;
  contribution: number;
  direction: 'positive' | 'negative';
}

export interface ForecastResponse {
  station_id: number;
  station_name: string;
  prediction_time_utc: string;
  target_time_utc: string;
  horizon_hours: number;
  model_id: string;
  model_type: string;
  predicted_pm25: number;
  unit: string;
  data_availability_status: string;
  input_features_summary?: InputFeaturesSummary | null;
  feature_attributions?: FeatureAttribution[];
}

export interface ForecastUnavailableResponse {
  station_id: number;
  requested_time_utc?: string | null;
  status: string;
  detail: string;
  latest_available_data_utc?: string | null;
}

export interface TrajectoryPoint {
  step: number;
  target_time_utc: string;
  predicted_pm25: number;
  lower_bound_pm25: number;
  upper_bound_pm25: number;
  aqi_category: string;
  traffic_proxy_index: number;
  ventilation_index: number;
}

export interface ForecastTrajectoryResponse {
  station_id: number;
  station_name: string;
  initialization_time_utc: string;
  horizon_hours: number;
  model_id: string;
  model_type: string;
  unit: string;
  data_availability_status: string;
  trajectory: TrajectoryPoint[];
  peak_predicted_pm25: number;
  peak_target_time_utc: string;
  min_predicted_pm25: number;
  min_target_time_utc: string;
  average_predicted_pm25: number;
  dominant_naqi_category: string;
  uncertainty_note: string;
}

