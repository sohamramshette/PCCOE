import { apiClient } from './client';
import { PaginatedPredictions } from '../types/prediction';

export interface GetPredictionsParams {
  model_id?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function getPredictions(
  stationId: number,
  params: GetPredictionsParams = {}
): Promise<PaginatedPredictions> {
  return apiClient<PaginatedPredictions>(`/api/v1/stations/${stationId}/predictions`, {
    params,
  });
}
