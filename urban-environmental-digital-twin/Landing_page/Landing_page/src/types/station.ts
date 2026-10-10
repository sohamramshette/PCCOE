/**
 * Station and Spatial Exposure Types
 * Matches backend/app/schemas/station.py and spatial.py
 */

export interface TrafficExposure {
  station_id: number;
  buffer_radius_m: number;
  buffer_area_km2: number;
  total_road_segments: number;
  total_road_length_km: number;
  major_road_length_km: number;
  local_road_length_km: number;
  major_road_density_km_per_km2: number;
  total_road_density_km_per_km2: number;
  distance_to_nearest_major_road_m: number;
  nearest_major_road_name?: string | null;
  nearest_major_road_class?: string | null;
  data_provenance: string;
  updated_at: string;
}

export interface ActivityExposure {
  station_id: number;
  industrial_elements_2km: number;
  dist_nearest_industrial_m: number;
  has_industrial_within_1km: boolean;
  construction_elements_1_5km: number;
  dist_nearest_construction_m: number;
  has_construction_within_1km: boolean;
  poi_total_count_1_5km: number;
  poi_density_per_km2: number;
  poi_commercial_count: number;
  poi_institutional_count: number;
  poi_transit_count: number;
  landuse_elements_total: number;
  landuse_residential_count: number;
  landuse_commercial_count: number;
  landuse_industrial_count: number;
  landuse_green_count: number;
  dominant_landuse: string;
  data_provenance: string;
  updated_at: string;
}

export interface Station {
  station_id: number;
  station_name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  city: string;
  monitoring_authority: string;
  is_active: boolean;
  data_provenance: string;
  created_at: string;
  updated_at: string;
}

export interface StationDetail extends Station {
  traffic_exposure?: TrafficExposure | null;
  activity_exposure?: ActivityExposure | null;
}
