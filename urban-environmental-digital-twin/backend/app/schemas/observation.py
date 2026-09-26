"""
Urban Environmental Digital Twin - Environmental Observation Schemas
=====================================================================
Defines response models for in-situ ambient air quality observations.
Preserves NULL values for unmonitored or dropped pollutant sensors.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ObservationItem(BaseModel):
    id: int = Field(description="Internal surrogate record ID")
    station_id: int = Field(description="Monitoring station ID")
    datetime_utc: datetime = Field(description="Observation timestamp in UTC (ISO 8601)")
    datetime_local_ist: datetime = Field(description="Indian Standard Time (UTC+05:30)")
    
    # Ground Truth Air Quality Pollutants (Preserve NULLs)
    pm25: Optional[float] = Field(default=None, description="Observed ambient PM2.5 (ug/m3)")
    pm25_obs_count: Optional[int] = Field(default=None, description="Number of valid sub-hourly readings")
    pm25_completeness_flag: str = Field(description="Regulatory completeness flag: FULL, PARTIAL, INSUFFICIENT, MISSING")
    
    pm10: Optional[float] = Field(default=None, description="Observed ambient PM10 (ug/m3)")
    pm10_obs_count: Optional[int] = Field(default=None)
    no2: Optional[float] = Field(default=None, description="Observed Nitrogen Dioxide (ug/m3)")
    no2_obs_count: Optional[int] = Field(default=None)
    so2: Optional[float] = Field(default=None, description="Observed Sulfur Dioxide (ug/m3)")
    co: Optional[float] = Field(default=None, description="Observed Carbon Monoxide (mg/m3)")
    o3: Optional[float] = Field(default=None, description="Observed Ozone (ug/m3)")
    
    # In-situ Co-located Sensors
    temp_insitu_c: Optional[float] = Field(default=None, description="In-situ sensor temperature (deg C)")
    humidity_insitu_pct: Optional[float] = Field(default=None, description="In-situ relative humidity (%)")
    wind_speed_insitu_ms: Optional[float] = Field(default=None, description="In-situ wind speed (m/s)")
    
    data_provenance: str = Field(description="Classification: OBSERVED ground truth")

    model_config = ConfigDict(from_attributes=True)


class PaginatedObservations(BaseModel):
    station_id: int = Field(description="Monitoring station ID")
    total: int = Field(description="Total observations matching filter criteria")
    page: int = Field(description="Current 1-based page number")
    limit: int = Field(description="Records requested per page")
    offset: int = Field(description="Record offset")
    pages: int = Field(description="Total available pages")
    items: List[ObservationItem] = Field(description="Chronological hourly observation records")
