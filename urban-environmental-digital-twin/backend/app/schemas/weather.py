"""
Urban Environmental Digital Twin - Weather Reanalysis Schemas
=============================================================
Defines response models for ECMWF ERA5-Land meteorological reanalysis.
Explicitly labeled as REANALYSIS to distinguish from physical station sensors.
"""

from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict, Field, computed_field


class WeatherItem(BaseModel):
    id: int = Field(description="Internal surrogate record ID")
    station_id: int = Field(description="Associated monitoring station ID")
    datetime_utc: datetime = Field(description="Reanalysis timestamp in UTC (ISO 8601)")
    
    # Atmospheric State & Surface Meteorology
    temp_c: float = Field(description="2m Air temperature (deg C)")
    humidity_pct: float = Field(description="2m Relative humidity (%)")
    dew_point_c: float = Field(description="2m Dew point temperature (deg C)")
    precip_mm: float = Field(description="Total precipitation (mm)")
    rain_mm: float = Field(description="Liquid rain (mm)")
    pressure_hpa: float = Field(description="Surface atmospheric pressure (hPa)")
    wind_speed_ms: float = Field(description="10m Wind speed (m/s)")
    wind_dir_deg: float = Field(description="10m Wind direction (degrees from True North)")
    solar_rad_wm2: float = Field(description="Global horizontal solar radiation (W/m2)")
    cloud_cover_pct: float = Field(description="Total cloud cover (%)")
    pbl_height_m: float = Field(description="Planetary boundary layer height (meters)")
    
    # Reanalysis Metadata
    grid_latitude: float = Field(description="ERA5-Land grid centroid latitude")
    grid_longitude: float = Field(description="ERA5-Land grid centroid longitude")
    elevation_m: float = Field(description="ERA5-Land surface geopotential elevation (meters)")
    data_provenance: str = Field(description="Data classification: REANALYSIS (ECMWF ERA5-Land via Open-Meteo)")

    @computed_field
    @property
    def datetime_local_ist(self) -> datetime:
        return self.datetime_utc + timedelta(hours=5, minutes=30)

    model_config = ConfigDict(from_attributes=True)


class PaginatedWeather(BaseModel):
    station_id: int = Field(description="Associated monitoring station ID")
    total: int = Field(description="Total weather records matching filter criteria")
    page: int = Field(description="Current 1-based page number")
    limit: int = Field(description="Records requested per page")
    offset: int = Field(description="Record offset")
    pages: int = Field(description="Total available pages")
    data_classification: str = Field(
        default="REANALYSIS (ECMWF ERA5-Land)",
        description="Explicit classification confirming data is numerical reanalysis, not in-situ observation"
    )
    items: List[WeatherItem] = Field(description="Chronological hourly reanalysis records")
