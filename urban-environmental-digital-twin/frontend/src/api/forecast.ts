import { apiClient } from './client';
import { ForecastResponse } from '../types/forecast';
import { ForecastExplanation } from '../types/llm';

export interface GetForecastParams {
  timestamp?: string;
  model_id?: string;
}

export async function getForecast(
  stationId: number,
  params: GetForecastParams = {}
): Promise<ForecastResponse> {
  return apiClient<ForecastResponse>(`/api/v1/stations/${stationId}/forecast`, {
    params,
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

