import { apiClient } from './client';
import { ForecastResponse } from '../types/forecast';

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
