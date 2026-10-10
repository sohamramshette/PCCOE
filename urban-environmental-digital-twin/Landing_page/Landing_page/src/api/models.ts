import { apiClient } from './client';
import { ModelSummary, ModelDetail } from '../types/model';

export async function getModels(): Promise<ModelSummary[]> {
  return apiClient<ModelSummary[]>('/api/v1/models');
}

export async function getModel(modelId: string): Promise<ModelDetail> {
  return apiClient<ModelDetail>(`/api/v1/models/${modelId}`);
}
