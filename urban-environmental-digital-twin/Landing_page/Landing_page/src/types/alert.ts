export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type AlertType =
  | 'PM25_THRESHOLD'
  | 'PM10_THRESHOLD'
  | 'NO2_THRESHOLD'
  | 'SO2_THRESHOLD'
  | 'CO_THRESHOLD'
  | 'O3_THRESHOLD'
  | 'PM25_SPIKE'
  | 'PM25_ANOMALY'
  | 'FORECAST_DEVIATION'
  | 'LOW_WIND'
  | 'LOW_PBL'
  | 'ATMOSPHERIC_STAGNATION'
  | 'SENSOR_OFFLINE'
  | 'DATA_GAP'
  | 'SENSOR_ANOMALY';

export interface AlertItem {
  alert_id: number;
  station_id: number;
  station_name?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  pollutant?: string | null;
  observed_value?: number | null;
  threshold_value?: number | null;
  expected_value?: number | null;
  deviation?: number | null;
  message: string;
  source: string;
  status: AlertStatus;
  detected_at: string;
  started_at: string;
  ended_at?: string | null;
  alert_metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export type Alert = AlertItem;

export interface AlertSummary {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  last_evaluated_at?: string | null;
}

export interface PaginatedAlerts {
  total: number;
  page: number;
  limit: number;
  offset: number;
  pages: number;
  items: AlertItem[];
}

export interface AlertFilters {
  station_id?: number;
  alert_type?: string;
  severity?: string;
  status?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface AlertEvaluationResponse {
  status: string;
  evaluated_at: string;
  stations_evaluated: number;
  alerts_created: number;
  alerts_updated: number;
  alerts_resolved: number;
  active_total: number;
  details: Array<Record<string, any>>;
}
