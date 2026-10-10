/**
 * Weather Reanalysis Types
 * Matches backend/app/schemas/weather.py
 */

export interface WeatherItem {
  id: number;
  station_id: number;
  datetime_utc: string;
  datetime_local_ist: string;

  temp_c: number;
  humidity_pct: number;
  dew_point_c: number;
  precip_mm: number;
  rain_mm: number;
  pressure_hpa: number;
  wind_speed_ms: number;
  wind_dir_deg: number;
  solar_rad_wm2: number;
  cloud_cover_pct: number;
  pbl_height_m: number;

  grid_latitude: number;
  grid_longitude: number;
  elevation_m: number;
  data_provenance: string; // "REANALYSIS (ECMWF ERA5-Land via Open-Meteo)"
}

export interface PaginatedWeather {
  station_id: number;
  total: number;
  page: number;
  limit: number;
  offset: number;
  pages: number;
  data_classification: string;
  items: WeatherItem[];
}
