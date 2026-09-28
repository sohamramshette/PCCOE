import { apiClient } from './client';
import {
  ScenarioCreateRequest,
  ScenarioResponse,
  ScenarioRunResponse,
  ScenarioListResponse,
  ScenarioResultsListResponse,
} from '../types/scenario';
import { ScenarioExplanation, PolicyReportResponse } from '../types/llm';

export async function createScenario(data: ScenarioCreateRequest): Promise<ScenarioResponse> {
  return apiClient<ScenarioResponse>('/api/v1/scenarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getScenarios(params?: { limit?: number; offset?: number }): Promise<ScenarioListResponse> {
  return apiClient<ScenarioListResponse>('/api/v1/scenarios', {
    params,
  });
}

export async function getScenario(scenarioId: string): Promise<ScenarioResponse> {
  return apiClient<ScenarioResponse>(`/api/v1/scenarios/${scenarioId}`);
}

export async function runScenario(scenarioId: string): Promise<ScenarioRunResponse> {
  return apiClient<ScenarioRunResponse>(`/api/v1/scenarios/${scenarioId}/run`, {
    method: 'POST',
  });
}

export async function getScenarioResults(
  scenarioId: string,
  params?: { limit?: number; offset?: number }
): Promise<ScenarioResultsListResponse> {
  return apiClient<ScenarioResultsListResponse>(`/api/v1/scenarios/${scenarioId}/results`, {
    params,
  });
}

export async function explainScenario(scenarioId: string): Promise<ScenarioExplanation> {
  return apiClient<ScenarioExplanation>(`/api/v1/scenarios/${scenarioId}/explain`, {
    method: 'POST',
    timeoutMs: 45000,
  });
}

export async function generatePolicyReport(scenarioId: string): Promise<PolicyReportResponse> {
  return apiClient<PolicyReportResponse>(`/api/v1/scenarios/${scenarioId}/report`, {
    method: 'POST',
    timeoutMs: 45000,
  });
}

