import { apiClient } from './client';
import { PaginatedWeather } from '../types/weather';

export interface GetWeatherParams {
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function getWeather(
  stationId: number,
  params: GetWeatherParams = {}
): Promise<PaginatedWeather> {
  return apiClient<PaginatedWeather>(`/api/v1/stations/${stationId}/weather`, {
    params,
  });
}
