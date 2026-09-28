"""
Pydantic schemas for static spatial infrastructure exposures.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TrafficExposureRead(BaseModel):
    station_id: int
    buffer_radius_m: float
    buffer_area_km2: float
    total_road_segments: int
    total_road_length_km: float
    major_road_length_km: float
    local_road_length_km: float
    major_road_density_km_per_km2: float
    total_road_density_km_per_km2: float
    distance_to_nearest_major_road_m: float
    nearest_major_road_name: Optional[str] = None
    nearest_major_road_class: Optional[str] = None
    data_provenance: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityExposureRead(BaseModel):
    station_id: int
    industrial_elements_2km: int
    dist_nearest_industrial_m: float
    has_industrial_within_1km: bool
    construction_elements_1_5km: int
    dist_nearest_construction_m: float
    has_construction_within_1km: bool
    poi_total_count_1_5km: int
    poi_density_per_km2: float
    poi_commercial_count: int
    poi_institutional_count: int
    poi_transit_count: int
    landuse_elements_total: int
    landuse_residential_count: int
    landuse_commercial_count: int
    landuse_industrial_count: int
    landuse_green_count: int
    dominant_landuse: str
    data_provenance: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterpolatedGridPoint(BaseModel):
    lat: float
    lon: float
    pm25: float
    aqi_category: str
    color: str
    distance_to_nearest_km: float
    nearest_station_id: int
    nearest_station_name: str
    confidence: float


class SpatialInterpolationResponse(BaseModel):
    method: str
    power: float
    grid_step: float
    total_grid_points: int
    bounding_box: dict
    timestamp_utc: datetime
    min_pm25: float
    max_pm25: float
    mean_pm25: float
    active_stations_count: int
    grid_points: list[InterpolatedGridPoint]


class CoordinateInterpolationRequest(BaseModel):
    latitude: float
    longitude: float
    power: float = 2.0


class ContributingStationWeight(BaseModel):
    station_id: int
    station_name: str
    distance_km: float
    weight_percentage: float
    observed_pm25: float


class CoordinateInterpolationResponse(BaseModel):
    latitude: float
    longitude: float
    interpolated_pm25: float
    aqi_category: str
    color: str
    confidence_score: float
    nearest_station_id: int
    nearest_station_name: str
    distance_to_nearest_km: float
    contributing_stations: list[ContributingStationWeight]

