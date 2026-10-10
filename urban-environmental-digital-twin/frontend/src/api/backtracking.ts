/**
 * Urban Environmental Digital Twin - Pollution Backtracking API
 * Communicates with /api/v1/backtracking backend routes.
 */

import { apiClient } from './client';
import {
  BacktrackingRequest,
  BacktrackingResponse,
  CuratedEventsResponse,
} from '../types/backtracking';

/**
 * Executes a 2D kinematic backward atmospheric transport trajectory simulation
 * from the designated receptor station using ERA5-Land reanalysis winds.
 */
export async function simulateBacktracking(
  request: BacktrackingRequest
): Promise<BacktrackingResponse> {
  return apiClient<BacktrackingResponse>('/api/v1/backtracking/simulate', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMs: 45000,
  });
}

/**
 * Retrieves the catalog of pre-audited historical pollution benchmark events
 * with verified data-quality classifications (multi-station episodes vs unverified spikes).
 */
export async function getCuratedEvents(): Promise<CuratedEventsResponse> {
  return apiClient<CuratedEventsResponse>('/api/v1/backtracking/curated-events', {
    method: 'GET',
    timeoutMs: 15000,
  });
}
