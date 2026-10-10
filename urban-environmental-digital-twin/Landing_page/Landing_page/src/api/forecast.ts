import { apiClient } from './client';
import { ForecastResponse, ForecastTrajectoryResponse } from '../types/forecast';
import { ForecastExplanation } from '../types/llm';

export interface GetForecastParams {
  timestamp?: string;
  model_id?: string;
  horizon_hours?: number;
}

export async function getForecast(
  stationId: number,
  params: GetForecastParams = {}
): Promise<ForecastResponse> {
  return apiClient<ForecastResponse>(`/api/v1/stations/${stationId}/forecast`, {
    params,
  });
}

export async function getForecastTrajectory(
  stationId: number,
  params: GetForecastParams = {}
): Promise<ForecastTrajectoryResponse> {
  return apiClient<ForecastTrajectoryResponse>(`/api/v1/stations/${stationId}/forecast/trajectory`, {
    params,
    timeoutMs: 30000,
  });
}

export async function getForecastExplanation(
  stationId: number,
  params: GetForecastParams = {}
): Promise<ForecastExplanation> {
  return apiClient<ForecastExplanation>(`/api/v1/stations/${stationId}/forecast/explain`, {
    params,
    timeoutMs: 45000,
  });
}

