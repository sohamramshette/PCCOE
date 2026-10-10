export interface StationSyncResult {
  station_id: number;
  station_name: string;
  timestamp_utc: string | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  status: string;
  detail?: string | null;
}

export interface OpenAQSyncResponse {
  status: string;
  synced_at_utc: string;
  stations_attempted: number;
  stations_successful: number;
  records_ingested: number;
  records_updated: number;
  details: StationSyncResult[];
}

export interface SyncStatusResponse {
  service_status: string;
  openaq_api_configured: boolean;
  last_sync_timestamp_utc: string | null;
  total_realtime_records: number;
  network_latest_observation_utc: string | null;
  active_stations_monitored: number;
}
