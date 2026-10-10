import { apiClient } from './client';
import { HealthResponse } from '../types/common';

export async function getHealth(): Promise<HealthResponse> {
  return apiClient<HealthResponse>('/health');
}
