/**
 * Model Registry Types
 * Matches backend/app/schemas/model_registry.py
 */

export interface ModelMetrics {
  mae?: number;
  rmse?: number;
  r2?: number;
  medae?: number;
  [key: string]: number | string | undefined;
}

export interface ModelSummary {
  model_id: string;
  model_name: string;
  model_type: string;
  version: string;
  target: string;
  horizon: string;
  feature_set: string;
  is_active: boolean;
  validation_mae: number;
  test_mae: number;
}

export interface ModelDetail extends ModelSummary {
  training_start: string;
  training_end: string;
  validation_start: string;
  validation_end: string;
  test_start: string;
  test_end: string;
  metrics: {
    validation?: ModelMetrics;
    test?: ModelMetrics;
    [split: string]: ModelMetrics | undefined;
  };
  created_at: string;
}
