"""
Urban Environmental Digital Twin - Station Pydantic Schemas
===========================================================
Defines response models for station listing and detailed geospatial profiles.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.spatial import TrafficExposureRead, ActivityExposureRead


class StationBase(BaseModel):
    station_id: int = Field(description="Unique CPCB/MPCB/OpenAQ station ID")
    station_name: str = Field(description="Human-readable station name")
    zone_type: str = Field(description="Urban environmental zone classification")
    latitude: float = Field(description="Geographic latitude coordinate (WGS84)")
    longitude: float = Field(description="Geographic longitude coordinate (WGS84)")
    elevation_m: Optional[float] = Field(default=None, description="Station ground elevation (meters)")
    city: str = Field(default="Pune", description="City / Municipal corporation")
    monitoring_authority: str = Field(description="Operating environmental authority (IITM SAFAR / MPCB)")
    is_active: bool = Field(default=True, description="Operating status of monitoring station")
    data_provenance: str = Field(default="OpenAQ API v3 / CPCB CAAQMN", description="Source metadata")


class StationCreate(StationBase):
    pass


class StationRead(StationBase):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StationDetail(StationRead):
    """Detailed station profile including static road and activity GIS exposures."""
    traffic_exposure: Optional[TrafficExposureRead] = None
    activity_exposure: Optional[ActivityExposureRead] = None

    model_config = ConfigDict(from_attributes=True)
