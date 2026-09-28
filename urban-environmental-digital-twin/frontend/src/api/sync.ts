import { apiClient } from './client';
import { OpenAQSyncResponse, SyncStatusResponse } from '../types/sync';

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  return apiClient<SyncStatusResponse>('/api/v1/sync/status', {
    timeoutMs: 10000,
  });
}

export async function triggerOpenAQSync(): Promise<OpenAQSyncResponse> {
  return apiClient<OpenAQSyncResponse>('/api/v1/sync/openaq', {
    method: 'POST',
    timeoutMs: 30000,
  });
}
