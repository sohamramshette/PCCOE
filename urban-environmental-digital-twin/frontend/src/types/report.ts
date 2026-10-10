/**
 * Citizen Pollution Incident Report Types
 * ========================================
 * Types matching backend/app/schemas/citizen_report.py
 */

export type ReportCategory =
  | 'SMOKE_EMISSIONS'
  | 'OPEN_BURNING'
  | 'CONSTRUCTION_DUST'
  | 'INDUSTRIAL_EMISSIONS'
  | 'UNUSUAL_ODOUR'
  | 'OTHER';

export interface CitizenReportItem {
  id: number;
  report_reference: string;
  category: ReportCategory;
  description: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  nearest_station_id?: number | null;
  observed_at: string;
  submitted_at: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED';
  attachment_filename?: string | null;
  attachment_path?: string | null;
  attachment_size_bytes?: number | null;
}

export interface CitizenReportSubmitResponse {
  status: string;
  message: string;
  report_reference: string;
  report: CitizenReportItem;
}
