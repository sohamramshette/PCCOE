/**
 * Environmental Observation Types
 * Matches backend/app/schemas/observation.py
 */

export interface ObservationItem {
  id: number;
  station_id: number;
  datetime_utc: string;
  datetime_local_ist: string;

  // Ground Truth Air Quality Pollutants (Nullable)
  pm25?: number | null;
  pm25_obs_count?: number | null;
  pm25_completeness_flag: 'FULL' | 'PARTIAL' | 'INSUFFICIENT' | 'MISSING' | string;

  pm10?: number | null;
  pm10_obs_count?: number | null;
  no2?: number | null;
  no2_obs_count?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;

  // In-situ Co-located Sensors (Nullable)
  temp_insitu_c?: number | null;
  humidity_insitu_pct?: number | null;
  wind_speed_insitu_ms?: number | null;

  data_provenance: string; // e.g. "OBSERVED ground truth"
}

export interface PaginatedObservations {
  station_id: number;
  total: number;
  page: number;
  limit: number;
  offset: number;
  pages: number;
  items: ObservationItem[];
}
