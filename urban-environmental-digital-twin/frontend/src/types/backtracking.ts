/**
 * Urban Environmental Digital Twin - Pollution Backtracking Types
 * Mirrors backend/app/schemas/backtracking.py
 */

export type SpatialCoverageStatus = 'WITHIN_NETWORK_DOMAIN' | 'EXCEEDED_LOCAL_DOMAIN';

export type StationEvidenceStatus = 'VALID_OBSERVATION' | 'TELEMETRY_OFFLINE' | 'DATA_GAP';

export type ValidationStatus =
  | 'HIGH_CONFIDENCE_MULTI_STATION_EPISODE'
  | 'HIGH_CONFIDENCE_MONITORED_PEAK'
  | 'UNVERIFIED_LOCAL_SPIKE_POTENTIAL_ARTIFACT'
  | 'STANDARD_HISTORICAL_PERIOD';

export type RelativeWindAlignment = 'UPWIND_CORRIDOR' | 'DOWNWIND_CORRIDOR' | 'CROSSWIND';

export interface BacktrackingRequest {
  station_id: number;
  arrival_datetime_utc: string; // ISO 8601 string in UTC (e.g. 2025-12-26T16:00:00Z)
  backward_duration_hours?: number; // 1 to 48
  step_interval_minutes?: number; // strictly 60
}

export interface TrajectoryWaypoint {
  step_hours_back: number;
  datetime_utc: string;
  datetime_local_ist: string;
  latitude: number;
  longitude: number;
  wind_speed_ms: number | null;
  wind_dir_deg: number | null;
  wind_u: number | null;
  wind_v: number | null;
  pbl_height_m: number | null;
  ventilation_index_m2s: number | null;
  step_distance_km: number;
  cumulative_distance_km: number;
  data_provenance: string;
  spatial_coverage_status: SpatialCoverageStatus;
  nearest_station_id: number | null;
  nearest_station_name: string | null;
}

export interface CorrelatedStationEvidence {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
  distance_to_receptor_km: number;
  bearing_from_receptor_deg: number;
  relative_wind_alignment: RelativeWindAlignment | null;
  observed_pm25_at_arrival: number | null;
  cpcb_naqi_category: string | null;
  data_status: StationEvidenceStatus;
  correlation_coefficient: number | null;
  valid_sample_count: number;
  interpretation_note: string;
}

export interface InvestigationSummary {
  observed_facts: string[];
  meteorological_context: string[];
  calculated_trajectory_summary: string;
  candidate_explanations: string[];
  scientific_limitations: string[];
  data_quality_assessment: string;
}

export interface BacktrackingMetadata {
  calculation_model: string;
  wind_data_source: string;
  air_quality_data_source: string;
  timezone_storage: string;
  spatial_coverage_domain: string;
  coverage_warnings: string[];
  disclaimer: string;
}

export interface ReceptorStationInfo {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
  city: string;
  zone_type: string;
  monitoring_authority: string;
}

export interface BacktrackingResponse {
  status: 'COMPLETED' | 'PARTIAL_COVERAGE' | string;
  receptor_station: ReceptorStationInfo;
  arrival_datetime_utc: string;
  arrival_datetime_ist: string;
  observed_pm25_ug_m3: number | null;
  cpcb_naqi_category: string | null;
  backward_duration_hours: number;
  total_distance_km: number;
  waypoints: TrajectoryWaypoint[];
  multi_station_evidence: CorrelatedStationEvidence[];
  investigation_summary: InvestigationSummary;
  metadata: BacktrackingMetadata;
}

export interface CuratedEventItem {
  event_id: string;
  station_id: number;
  station_name: string;
  datetime_utc: string;
  datetime_ist: string;
  observed_pm25: number;
  cpcb_naqi_category: string;
  headline: string;
  description: string;
  validation_status: ValidationStatus;
  data_quality_notes: string;
}

export interface CuratedEventsResponse {
  total_events: number;
  events: CuratedEventItem[];
}
