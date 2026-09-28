export interface InterpolatedGridPoint {
  lat: number;
  lon: number;
  pm25: number;
  aqi_category: string;
  color: string;
  distance_to_nearest_km: number;
  nearest_station_id: number;
  nearest_station_name: string;
  confidence: number;
}

export interface SpatialInterpolationResponse {
  method: string;
  power: number;
  grid_step: number;
  total_grid_points: number;
  bounding_box: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
  timestamp_utc: string;
  min_pm25: number;
  max_pm25: number;
  mean_pm25: number;
  active_stations_count: number;
  grid_points: InterpolatedGridPoint[];
}

export interface ContributingStationWeight {
  station_id: number;
  station_name: string;
  distance_km: number;
  weight_percentage: number;
  observed_pm25: number;
}

export interface CoordinateInterpolationResponse {
  latitude: number;
  longitude: number;
  interpolated_pm25: number;
  aqi_category: string;
  color: string;
  confidence_score: number;
  nearest_station_id: number;
  nearest_station_name: string;
  distance_to_nearest_km: number;
  contributing_stations: ContributingStationWeight[];
}
