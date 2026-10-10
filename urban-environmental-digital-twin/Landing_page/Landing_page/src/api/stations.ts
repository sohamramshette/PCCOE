import { apiClient } from './client';
import { Station, StationDetail } from '../types/station';

export async function getStations(activeOnly: boolean = true): Promise<Station[]> {
  return apiClient<Station[]>('/api/v1/stations', {
    params: { active_only: activeOnly },
  });
}

export async function getStation(stationId: number): Promise<StationDetail> {
  return apiClient<StationDetail>(`/api/v1/stations/${stationId}`);
}
