/**
 * Citizen Pollution Reports API Client
 * =====================================
 * Handles form submissions with optional photo attachments,
 * local device token report retrieval, and single report lookups.
 */

import { apiClient } from './client';
import {
  CitizenReportItem,
  CitizenReportSubmitResponse,
  ReportCategory,
} from '../types/report';

export interface ReportSubmissionData {
  category: ReportCategory;
  description: string;
  location_name: string;
  observed_at: string; // ISO 8601
  latitude?: number | null;
  longitude?: number | null;
  nearest_station_id?: number | null;
  client_device_token: string;
}

/**
 * Submits a citizen pollution report. If a photo File is attached,
 * uses FormData to multipart-upload the image safely.
 */
export async function submitPollutionReport(
  data: ReportSubmissionData,
  photoFile?: File | null
): Promise<CitizenReportSubmitResponse> {
  if (photoFile) {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('location_name', data.location_name);
    formData.append('observed_at', data.observed_at);
    if (data.latitude !== null && data.latitude !== undefined) {
      formData.append('latitude', String(data.latitude));
    }
    if (data.longitude !== null && data.longitude !== undefined) {
      formData.append('longitude', String(data.longitude));
    }
    if (data.nearest_station_id !== null && data.nearest_station_id !== undefined) {
      formData.append('nearest_station_id', String(data.nearest_station_id));
    }
    formData.append('client_device_token', data.client_device_token);
    formData.append('file', photoFile);

    return apiClient<CitizenReportSubmitResponse>('/api/v1/reports/submit-form', {
      method: 'POST',
      body: formData,
    });
  }

  // Pure JSON submission
  return apiClient<CitizenReportSubmitResponse>('/api/v1/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Retrieves reports submitted from the resident's current device token.
 */
export async function getMyReports(clientToken: string): Promise<CitizenReportItem[]> {
  if (!clientToken || clientToken.trim().length < 8) return [];
  return apiClient<CitizenReportItem[]>('/api/v1/reports/my-reports', {
    params: { client_token: clientToken.trim() },
  });
}

/**
 * Retrieves single report details by public tracking reference.
 */
export async function getReportByReference(reference: string): Promise<CitizenReportItem> {
  return apiClient<CitizenReportItem>(`/api/v1/reports/${encodeURIComponent(reference.trim())}`);
}
