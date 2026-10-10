import { apiClient } from './client';
import {
  AlertItem,
  PaginatedAlerts,
  AlertSummary,
  AlertFilters,
  AlertEvaluationResponse,
} from '../types/alert';

export async function getAlerts(filters: AlertFilters = {}): Promise<PaginatedAlerts> {
  return apiClient<PaginatedAlerts>('/api/v1/alerts', {
    params: filters,
  });
}

export async function getActiveAlerts(stationId?: number): Promise<AlertItem[]> {
  return apiClient<AlertItem[]>('/api/v1/alerts/active', {
    params: stationId ? { station_id: stationId } : undefined,
  });
}

export async function getAlert(alertId: number): Promise<AlertItem> {
  return apiClient<AlertItem>(`/api/v1/alerts/${alertId}`);
}

export async function getStationAlerts(
  stationId: number,
  status?: string,
  limit: number = 20
): Promise<AlertItem[]> {
  return apiClient<AlertItem[]>(`/api/v1/stations/${stationId}/alerts`, {
    params: {
      status,
      limit,
    },
  });
}

export async function getAlertSummary(): Promise<AlertSummary> {
  return apiClient<AlertSummary>('/api/v1/alerts/summary');
}

export async function acknowledgeAlert(alertId: number, note?: string): Promise<AlertItem> {
  return apiClient<AlertItem>(`/api/v1/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    params: note ? { note } : undefined,
  });
}

export async function resolveAlert(alertId: number, note?: string): Promise<AlertItem> {
  return apiClient<AlertItem>(`/api/v1/alerts/${alertId}/resolve`, {
    method: 'POST',
    params: note ? { note } : undefined,
  });
}

export async function evaluateAlerts(checkFreshness: boolean = false): Promise<AlertEvaluationResponse> {
  return apiClient<AlertEvaluationResponse>('/api/v1/alerts/evaluate', {
    method: 'POST',
    params: { check_freshness: checkFreshness },
  });
}
