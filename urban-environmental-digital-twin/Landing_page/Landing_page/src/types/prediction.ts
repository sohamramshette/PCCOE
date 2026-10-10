/**
 * Historical Model Prediction Types
 * Matches backend/app/schemas/prediction.py
 */

export interface PredictionItem {
  prediction_id: number;
  model_id: string;
  station_id: number;
  prediction_time_utc: string;
  target_time_utc: string;
  horizon_hours: number;
  predicted_pm25: number;
  actual_pm25?: number | null;
  split: 'VALIDATION' | 'TEST' | 'INFERENCE' | string;
  absolute_error?: number | null;
}

export interface PaginatedPredictions {
  station_id: number;
  model_id?: string | null;
  total: number;
  page: number;
  limit: number;
  offset: number;
  pages: number;
  items: PredictionItem[];
}
