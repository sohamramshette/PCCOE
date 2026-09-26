import { apiClient } from './client';
import { PaginatedObservations } from '../types/observation';

export interface GetObservationsParams {
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function getObservations(
  stationId: number,
  params: GetObservationsParams = {}
): Promise<PaginatedObservations> {
  return apiClient<PaginatedObservations>(`/api/v1/stations/${stationId}/observations`, {
    params,
  });
}
