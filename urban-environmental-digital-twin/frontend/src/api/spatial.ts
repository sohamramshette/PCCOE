import { apiClient } from './client';
import {
  SpatialInterpolationResponse,
  CoordinateInterpolationResponse
} from '../types/spatial';

export interface SpatialInterpolationParams {
  grid_step?: number;
  power?: number;
  timestamp?: string;
}

export async function getSpatialInterpolation(
  params: SpatialInterpolationParams = {}
): Promise<SpatialInterpolationResponse> {
  return apiClient<SpatialInterpolationResponse>('/api/v1/spatial/interpolation', {
    params,
    timeoutMs: 20000,
  });
}

export async function interpolateCoordinate(
  latitude: number,
  longitude: number,
  power: number = 2.0
): Promise<CoordinateInterpolationResponse> {
  return apiClient<CoordinateInterpolationResponse>('/api/v1/spatial/interpolate-coordinate', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, power }),
    timeoutMs: 15000,
  });
}

